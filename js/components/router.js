
import {inNote, inCc} from './midi-message.js'

export default {
  props:['input'],
  components:{
    inNote, inCc
  },
  template:`
  <div v-if="input && input!='APP'" class="bar second">

    <div
      class="status note"
      :class="{selected:clock==input.id}"
      @click="clock==input.id ? clock=null : clock=input.id"
      >CLOCK</div>

    <in-note :note="inNote"></in-note>

    <in-cc :cc="inCc"></in-cc>

    <div class="bar-text">TO</div>

    <div class="bar">

<!--
      <div :class="{selected:checkLink(input.id,output.id)}"
            v-for="output in monitor"
            v-if="input.name!=output.name"
            @click="toggleLink(input.id,output.id);"
            :key="output.id"
            class="status">
        {{output.name}}
      </div>
-->
      <div :class="{selected:checkLink(input.id,output.id)}"
            v-for="output in outputs"
            v-if="input.name!=output.name"
            @click="toggleLink(input.id,output.id);"
            :key="output.id"
            class="status">
        {{output.name}}
      </div>

      <div :class="{selected:checkLink(input.id,output.id)}"
            v-for="output in rtcoutputs"
            v-if="input.name!=output.name"
            @click="toggleLink(input.id,output.id);"
            :key="output.id"
            class="status">
        {{output.name}}
      </div>

    </div>
  </div>
  `,
  data() {
    return {
      clock:null,
      inNote:null,
      inCc:null,
      // monitor: [{'name':'Event Monitor','id':'event_monitor'}]
      inputs:WebMidi.inputs,
      outputs:WebMidi.outputs,
      rtcoutputs: rtcoutputs,
      links: {},
    }
  },
  watch: {
    inputs(inputs) {
      this.buildLinks()
    }
  },
  mounted() {
    if (localStorage.getItem('links')) {
      try {
        this.links = JSON.parse(localStorage.getItem('links'));
      } catch(e) {
        localStorage.removeItem('links');
      }
    }
  },
  methods: {
    checkLink(inId,outId) {
      let link = this.links[inId]
      if (link) {
        return link.ids.includes(outId)
      } else {
        return false
      }
    },
    toggleLink(inId,outId) {
      if (!this.links[inId]) {
        this.$set(this.links, inId ,{ids:[]})
      };
      let link = this.links[inId];
      if (!link.ids.includes(outId)) {
        link.ids.push(outId)
      } else {
        link.ids.splice(link.ids.indexOf(outId),1);
      }
      localStorage.setItem('links',JSON.stringify(this.links))
      this.buildLinks();
    },
    getLinks(id) {
      return this.links.filter(link => link.input==this.device.id)
    },
    set_peer_send(port){
        port.on('noteon','all',(event) => {
          if(send_all_toggle.checked)
          {
            console.log('Sending', event.data, event.timestamp);
            sendMessage({'data':event.data,'timestamp':event.timestamp});
          }
        })

        port.on('noteoff','all',(event) => {          
          if(send_all_toggle.checked)
          {
            console.log('Sending', event.data, event.timestamp);
            sendMessage({'data':event.data,'timestamp':event.timestamp});
          }
        })
    },
    checkChannel(ch) {
      if (!this.channels[ch]) {
        this.$set(this.channels, ch, {num:ch,notes:{}, cc:{}})
      }
    },
    makeNote(ev) {
      let note=ev.note;
      let time = new Date();
      note.id=ev.note.name+note.octave+time.getTime();
      note.nameOct=note.name+note.octave;
      note.channel=ev.channel;
      if (ev.type=='noteoff') {
        note.velocity=0;
      } else {
        note.velocity=ev.velocity;
      }
      note.digit = (note.number+3)%12;
      return note
    },
    noteInOn(ev) {
      this.inNote=ev;
      let note = this.makeNote(ev)
      this.$midiBus.$emit('noteinon'+note.channel,note);
      this.checkChannel(ev.channel);
      this.$set(this.channels[ev.channel].notes, note.nameOct, note)
      this.$emit('update:channels', this.channels)
    },
    noteInOff(ev) {
      let note = this.makeNote(ev)
      let nameOct = note.nameOct;
      let ch = ev.channel
      this.$midiBus.$emit('noteinoff'+note.channel, note)
      if (this.channels[ch] && this.channels[ch].notes && this.channels[ch].notes[nameOct]) {
        this.$set(this.channels[ch].notes, nameOct, note)
      }
      this.$emit('update:channels', this.channels)
    },

    buildLinks() {
      console.log('Build links')

      peer_in_ports_ids = [];
      rtcinputs.forEach((input) => {

        let link = this.links[input.id];

        if (link) {
          this.$set(link,'outputs', []);
          link.ids.forEach((outId) => {
            let output = WebMidi.getOutputById(outId);
            if (output) {
              link.outputs.push(output);
            }
            if(!peer_in_ports_ids.includes(outId))
              peer_in_ports_ids.push(outId)
        })
        }

      })

      this.inputs.forEach((input) => {

        input.removeListener();

        input.on('noteon','all',(event) => {
          this.inNote = {
            channel: event.channel,
            name: event.note.name,
            octave: event.note.octave,
            number: event.note.number,
            velocity: event.note.velocity,
          }

          this.noteInOn(event);
         
        })

        input.on('noteoff','all',(event) => {
          this.noteInOff(event);         
        })


        input.on('controlchange','all', (event) => {
          this.inCc={
            channel: event.channel,
            number:event.controller.number,
            value:event.value
          }
        })

        let link = this.links[input.id];

        if (link) {

          this.$set(link,'outputs', []);
          link.ids.forEach((outId) => {
            let output = WebMidi.getOutputById(outId);
            if (output) {
              link.outputs.push(output);
            }

            if (input.id=='peer_in')
            {
              if(!peer_in_ports_ids.includes(outId))
                peer_in_ports_ids.push(outId)
            }

          })

          input.on('midimessage','all', (event) => {
            if (event.data==248) {return}
            
            link.ids.forEach((outId) => {
              if (outId=='peer_out')
              {
                if(send_all_toggle.checked)
                {
                  console.log('Sending', event.data, event.timestamp);
                  sendMessage({'data':event.data,'timestamp':event.timestamp});
                }
              }
            })

            link.outputs.forEach(output => {
              output._midiOutput.send(event.data,event.timestamp)
            })
          })

          input.on('clock','all', (event) => {
            if (this.clock != input.id) {return}

            link.outputs.forEach(output => {
              output.sendClock({time:event.timestamp})
            })
          })

        }
      });
    }
  }
}
