self.addEventListener('notificationclick', (event) => {
  if (event.notification.tag !== 'feel-reminder') return
  event.notification.close()
  const home = new URL('./', self.registration.scope).href
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const journal = clients.find((client) => client.url.startsWith(home))
    return journal ? journal.focus() : self.clients.openWindow(home)
  }))
})
