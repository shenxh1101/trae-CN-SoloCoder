class AudioEffects {
    constructor() {
        this.audioContext = null;
        this.input = null;
        this.output = null;
        this.dryGain = null;
        
        this.reverbEnabled = false;
        this.reverbWet = 0.3;
        this.reverbNode = null;
        this.reverbWetGain = null;
        
        this.delayEnabled = false;
        this.delayWet = 0.3;
        this.delayTime = 0.3;
        this.delayNode = null;
        this.delayFeedback = null;
        this.delayWetGain = null;
    }

    init(audioContext, sourceNode, destinationNode) {
        this.audioContext = audioContext;
        
        this.input = this.audioContext.createGain();
        this.output = this.audioContext.createGain();
        this.dryGain = this.audioContext.createGain();
        this.dryGain.gain.value = 1;
        
        this.initReverb();
        this.initDelay();
        
        sourceNode.connect(this.input);
        
        this.output.connect(destinationNode);
        
        this.connectEffects();
    }

    initReverb() {
        this.reverbWetGain = this.audioContext.createGain();
        this.reverbWetGain.gain.value = 0;
        
        this.createReverbImpulse();
    }

    createReverbImpulse() {
        const sampleRate = this.audioContext.sampleRate;
        const duration = 2.5;
        const length = sampleRate * duration;
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        this.reverbNode = this.audioContext.createConvolver();
        this.reverbNode.buffer = impulse;
    }

    initDelay() {
        this.delayNode = this.audioContext.createDelay(5.0);
        this.delayNode.delayTime.value = this.delayTime;
        
        this.delayFeedback = this.audioContext.createGain();
        this.delayFeedback.gain.value = 0.4;
        
        this.delayWetGain = this.audioContext.createGain();
        this.delayWetGain.gain.value = 0;
    }

    connectEffects() {
        this.input.connect(this.dryGain);
        this.dryGain.connect(this.output);
        
        this.input.connect(this.reverbNode);
        this.reverbNode.connect(this.reverbWetGain);
        this.reverbWetGain.connect(this.output);
        
        this.input.connect(this.delayNode);
        this.delayNode.connect(this.delayWetGain);
        this.delayWetGain.connect(this.output);
        
        this.delayNode.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode);
        
        this.updateReverbState();
        this.updateDelayState();
    }

    setReverbEnabled(enabled) {
        this.reverbEnabled = enabled;
        this.updateReverbState();
    }

    setReverbWet(value) {
        this.reverbWet = value;
        this.updateReverbState();
    }

    updateReverbState() {
        if (this.reverbWetGain) {
            this.reverbWetGain.gain.setValueAtTime(
                this.reverbEnabled ? this.reverbWet : 0,
                this.audioContext.currentTime
            );
        }
    }

    setDelayEnabled(enabled) {
        this.delayEnabled = enabled;
        this.updateDelayState();
    }

    setDelayWet(value) {
        this.delayWet = value;
        this.updateDelayState();
    }

    setDelayTime(value) {
        this.delayTime = value;
        if (this.delayNode) {
            this.delayNode.delayTime.setValueAtTime(
                value,
                this.audioContext.currentTime
            );
        }
    }

    updateDelayState() {
        if (this.delayWetGain) {
            this.delayWetGain.gain.setValueAtTime(
                this.delayEnabled ? this.delayWet : 0,
                this.audioContext.currentTime
            );
        }
    }

    getInput() {
        return this.input;
    }

    getOutput() {
        return this.output;
    }
}

const audioEffects = new AudioEffects();
