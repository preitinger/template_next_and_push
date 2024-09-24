'use server'

import webpush from 'web-push'
import clientPromise from './_lib/mongodb';
import { ok } from 'assert';

webpush.setVapidDetails(
    'mailto:your-email@example.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
)

// TODO The following old type must be changed because it is a read-only type and PushSubscription cannot be passed as an arg for a server function because it is not a plain object.
// let subscription: PushSubscription | null = null // Attention this type PushSubscription is not webpush.PushSubscription
// So, we use instead the type PushSubscriptionJSON which is a plain object type:
let subscription: PushSubscriptionJSON | null = null;

interface SubscriptionDoc {
    _id: string;
    json: string;
}

export async function subscribeUser(sub: /*old type which is not a plain object: PushSubscription*/ /* new type */ PushSubscriptionJSON) {
    subscription = sub
    // In a production environment, you would want to store the subscription in a database
    // For example: await db.subscriptions.create({ data: sub })
    const client = await clientPromise;
    const db = client.db('test');
    const col = db.collection<SubscriptionDoc>('testSubscription');
    const res = await col.updateOne({
        _id: 'test'
    }, {
        $set: {
            json: JSON.stringify(subscription)
        }
    }, {
        upsert: true
    })
    ok(res.acknowledged);

    return { success: true }
}

export async function unsubscribeUser() {
    subscription = null
    // In a production environment, you would want to remove the subscription from the database
    // For example: await db.subscriptions.delete({ where: { ... } })
    const client = await clientPromise;
    const db = client.db('test');
    const col = db.collection<SubscriptionDoc>('testSubscription');
    const res = await col.deleteOne({
        _id: 'test'
    })
    ok(res.acknowledged);

    return { success: true }
}

export async function sendNotification(message: string) {
    let sub: PushSubscriptionJSON | null = null;

    // now with real db
    {
        const client = await clientPromise;
        const db = client.db('test');
        const col = db.collection<SubscriptionDoc>('testSubscription');
        const doc = await col.findOne({
            _id: 'test'
        })

        if (doc != null) {
            sub = JSON.parse(doc.json);
            console.log('sub from db', sub);
        }
    }



    if (!sub) {
        throw new Error('No subscription available')
    }

    try {
        // new:
        await webpush.sendNotification(
            {
                endpoint: sub.endpoint ?? '',
                keys: {
                    auth: sub.keys?.auth ?? '',
                    p256dh: sub.keys?.p256dh ?? ''
                }
            },
            JSON.stringify({
                title: 'Test Notification',
                body: message,
                icon: '/icon.png',
            })
        )
        // old, but a type bug because PushSubscription from client is mixed up with webpush.PushSubscription which is required by webpush.sendNotification():
        //await webpush.sendNotification(
        //  subscription, // this is a bug because webpush.PushSubscription is required, but subscription is of type PushSubscription
        //  JSON.stringify({
        //    title: 'Test Notification',
        //    body: message,
        //    icon: '/icon.png',
        //  })
        //)

        return { success: true }
    } catch (error) {
        console.error('Error sending push notification:', error)
        return { success: false, error: 'Failed to send notification' }
    }
}