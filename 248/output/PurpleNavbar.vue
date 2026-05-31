<template>
  <button 
    :style="buttonStyles"
    :disabled="disabled"
    @click="handleClick"
    :aria-label="label"
  >
    <span v-html="iconSVG"></span>
    <span>{{ label }}</span>
  </button>
</template>

<script>
export default {
  name: 'PurpleMenu',
  props: {
    label: {
      type: String,
      default: 'Click Me'
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click'],
  computed: {
    buttonStyles() {
      return {
        padding: '12px 24px',
        fontSize: '16px',
        backgroundColor: '#a855f7',
        color: 'white',
        border: 'none',
        cursor: this.disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontWeight: 500,
        transition: 'all 0.2s ease',
        opacity: this.disabled ? 0.6 : 1,


      };
    },
    iconSVG() {
      return `<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>`;
    }
  },
  methods: {
    handleClick(e) {
      if (!this.disabled) {
        this.$emit('click', e);
      }
    }
  }
};
</script>

<style scoped>
button:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}
button:active:not(:disabled) {
  transform: translateY(0);
}
</style>