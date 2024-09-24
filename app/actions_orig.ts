'use server'
 
import webpush from 'web-push'
 
webpush.setVapidDetails(
  'mailto:peter.reitinger@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)
 
let subscription: PushSubscriptionJSON | null = null
 
export async function subscribeUser(sub: PushSubscriptionJSON) {
  const endpoint = sub.endpoint;
  const keys = sub.keys;
  if (endpoint == null) throw new Error('Unexpected nullish endpoint');
  if (keys == null) throw new Error('Unexpected nullish keys');
  if (!('p256dh' in keys)) throw new Error('p256dh not in keys');
  subscription = sub;

  // In a production environment, you would want to store the subscription in a database
  // For example: await db.subscriptions.create({ data: sub })
  return { success: true }
}
 
export async function unsubscribeUser() {
  subscription = null
  // In a production environment, you would want to remove the subscription from the database
  // For example: await db.subscriptions.delete({ where: { ... } })
  return { success: true }
}
 
export async function sendNotification(message: string) {
  if (!subscription) {
    throw new Error('No subscription available')
  }
 
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint ?? '',
        keys:  {
          auth: subscription.keys?.auth ?? '',
          p256dh: subscription.keys?.p256dh ?? ''
        }
      },
      JSON.stringify({
        title: 'Test Notification',
        body: message,
        icon: '/icon.png',
      })
    )
    return { success: true }
  } catch (error) {
    console.error('Error sending push notification:', error)
    return { success: false, error: 'Failed to send notification' }
  }
}
