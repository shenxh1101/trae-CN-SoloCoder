class ExamplePlugin {
  constructor(api) {
    this.api = api;
    this.name = 'Example Plugin';
    this.version = '1.0.0';
  }

  async onLoad() {
    console.log('Example Plugin loaded!');
    
    await this.api.storage.set('plugin_loaded', true);
    await this.api.storage.set('install_time', new Date().toISOString());
    
    this.api.events.on('email:received', this.handleNewEmail.bind(this));
    
    return true;
  }

  async onUnload() {
    console.log('Example Plugin unloaded');
    this.api.events.off('email:received', this.handleNewEmail);
    return true;
  }

  async handleNewEmail(email) {
    console.log('New email received:', email.subject);
    
    const settings = await this.api.storage.get('notification_settings', { enabled: true });
    if (settings.enabled) {
      await this.api.notifications.show(
        '新邮件',
        `来自 ${email.from.name}: ${email.subject}`
      );
    }
  }

  async getStats() {
    const loaded = await this.api.storage.get('plugin_loaded', false);
    const installTime = await this.api.storage.get('install_time', null);
    return {
      loaded,
      installTime,
      pluginName: this.name,
      version: this.version
    };
  }

  async processEmail(email) {
    return {
      ...email,
      processedByExample: true,
      processedAt: new Date().toISOString()
    };
  }
}

module.exports = ExamplePlugin;
