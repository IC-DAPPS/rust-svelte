<script>
  import { Toasts } from "@dfinity/gix-components";
</script>

<Toasts />

<main>
  <slot />
</main>

<style lang="scss" global>
  @import "@dfinity/gix-components/dist/styles/global.scss";

  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100vh;
  }
</style>
