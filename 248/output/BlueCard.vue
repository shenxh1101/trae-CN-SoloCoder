<template>
  <button 
    :style="buttonStyles"
    :disabled="disabled"
    @click="handleClick"
    :aria-label="label"
  >
    
    <span>{{ label }}</span>
  </button>
</template>

<script>
export default {
  name: 'BlueCard',
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
        backgroundColor: '#3b82f6',
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
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      };
    },
    iconSVG() {
      return ``;
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