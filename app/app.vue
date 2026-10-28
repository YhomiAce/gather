<template>
  <div>
    <NuxtRouteAnnouncer />
    <header class="site-header">
      <div class="container">
        <NuxtLink to="/" class="brand"><img src="/favicon.svg" alt="" /> gather</NuxtLink>
        <NuxtLink to="/new" class="btn small">Create event</NuxtLink>
      </div>
    </header>
    <main>
      <NuxtPage />
    </main>
    <footer class="site-footer">gather · simple event pages and RSVPs</footer>
  </div>
</template>
