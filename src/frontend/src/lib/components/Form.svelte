<script lang="ts">
  import { Input, Tag, IconCheck } from "@dfinity/gix-components";

  // api function
  export let set: (name: string) => Promise<void>;

  // Form input
  let input: string = "";

  // Visibility
  let inputDisabled = false;
  let successVisible = false;

  const submit = async () => {
    inputDisabled = true;

    await set(input);
    successVisible = true;

    input = "";
    inputDisabled = false;
  };
</script>

<Input
  name="input"
  inputType="text"
  bind:value={input}
  disabled={inputDisabled}
  placeholder="Enter your name"
/>

<button data-testid="button" class="primary" on:click={submit} type="button"
  >Send</button
>

{#if successVisible}
  <Tag intent="success" testId="success">
    <IconCheck />
    Form successfully submitted!</Tag
  >
{/if}
