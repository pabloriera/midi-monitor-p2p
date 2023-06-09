
import router from "./router.js"

export default {
  components: {
    router
  },
  template:`
    <div class="midi-bus">

      <div class="bar">

        <div class="status" :class="{'active':midi.supported, 'error':!midi.supported, 'selected':selected=='APP'}"  @click="selected=='APP' ? selected=null : selected='APP'">
          <span v-if="!midi.inputs.length">CONNECT </span>MIDI<a target="_blank" href="https://caniuse.com/#search=web%20midi" v-if="!midi.supported"> NOT SUPPORTED</a>
        </div>

        <div v-if="midi.inputs.length" class="bar-text">FROM</div>

        <div
          @click="selected==input ? selected=null : selected=input"
          v-for="input in midi.inputs"
          class="status" :class="{selected:input==selected}">
          {{input.name}}
        </div>

        <div
          @click="selected==input ? selected=null : selected=input;"
          v-for="input in midi.rtcinputs"
          class="status" :class="{selected:input==selected}">
          {{input.name}}
        </div>    

      </div>
      <div v-if="selected=='APP'" class="bar second">

<!--
        <div class="status" @click="start()">
              	PLAY
        </div>
        <div class="status" @click="stop()">
              	STOP
        </div>
-->

        <div class="status" @click="clear()">
                CLEAR
        </div>
        <div class="bar-text">TO</div>

        <div :class="{selected:activeInputs[input.id]}"
              v-for="input in midi.inputs"
              @click="toggleOutput(input);"
              :key="input.id"
              class="status">
          {{input.name}}
        </div>


      </div>
      <router :input="selected" :channels="channels"></router>
    </div>
  `,
  props: ['absolute','channels'],
  data() {
    return {
      midi: {
        supported:WebMidi.supported,
        inputs: WebMidi.inputs,
        outputs: WebMidi.outputs,
        rtcinputs: rtcinputs
      },
      activeInputs:{},
      selected:WebMidi.inputs[0]||null,
      channels: this.channels
    }
  },
  watch: {
    'midi.inputs': function (inputs) {
      inputs.forEach((input) => {
        this.setListeners(input)
      })
    },
    'midi.outputs': function (outputs) {
      outputs.forEach((output) => {
        this.$set(this.activeInputs,output.id,output)
      })
    }
  },
  methods: {
    toggleOutput(input) {
      if (!this.activeInputs[input.id]) {
        this.$set(this.activeInputs,input.id,input)
        this.setListeners(input)
      } else {
        this.activeInputs[input.id]=null;
        delete this.activeInputs[input.id]
      }
    },
    start() {
      Object.values(this.activeInputs).forEach(output => {
        output.sendStart()
      })
    },
    stop() {
      Object.values(this.activeInputs).forEach(output => {
        output.sendStop()
      })
    },
    // checkChannel(ch) {
    //   if (!this.channels[ch]) {
    //     this.$set(this.channels, ch, {num:ch,notes:{}, cc:{}})
    //   }
    // },
    // makeNote(ev) {
    //   let note=ev.note;
    //   let time = new Date();
    //   note.id=ev.note.name+note.octave+time.getTime();
    //   note.nameOct=note.name+note.octave;
    //   note.channel=ev.channel;
    //   if (ev.type=='noteoff') {
    //     note.velocity=0;
    //   } else {
    //     note.velocity=ev.velocity;
    //   }
    //   note.digit = (note.number+3)%12;
    //   return note
    // },
    // noteInOn(ev) {
    //   this.inNote=ev;
    //   let note = this.makeNote(ev)
    //   this.$midiBus.$emit('noteinon'+note.channel,note);
    //   this.checkChannel(ev.channel);
    //   this.$set(this.channels[ev.channel].notes, note.nameOct, note)
    //   this.$emit('update:channels', this.channels)
    // },
    // noteInOff(ev) {
    //   let note = this.makeNote(ev)
    //   let nameOct = note.nameOct;
    //   let ch = ev.channel
    //   this.$midiBus.$emit('noteinoff'+note.channel, note)
    //   if (this.channels[ch] && this.channels[ch].notes && this.channels[ch].notes[nameOct]) {
    //     this.$set(this.channels[ch].notes, nameOct, note)
    //   }
    //   this.$emit('update:channels', this.channels)
    // },
    // ccInChange(ev) {
    //   this.inCc=ev;
    //   this.$midiBus.$emit(ev.channel+'cc'+ev.controller.number,ev.value)
    //   this.checkChannel(ev.channel)
    //   this.$set(this.channels[ev.channel].cc,ev.controller.number,ev.value);
    //   this.$emit('update:channels', this.channels)
    // },
    clear(e) {
      this.channels={}
      this.$midiBus.$emit('reset');
      this.$emit('update:channels', this.channels)
    },
    setListeners(input) {
      // input.removeListener();
      // input.addListener('noteon', "all", this.noteInOn);
      // input.addListener('noteoff', "all", this.noteInOff);
      // input.addListener('controlchange', "all", this.ccInChange);
  //    input.addListener('stop', 'all', this.reset)
    }
  },
  created() {
    if (WebMidi.supported) {
      WebMidi.enable();
    }
  },
  beforeDestroy() {
    this.midi.inputs.forEach(input => {
      input.removeListener();
    })
  }
}
