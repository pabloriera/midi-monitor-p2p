
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
      <div :class="{selected:checkLink(input.id,output.id)}"
            v-for="output in outputs"
            v-if="input.name!=output.name"
            @click="toggleLink(input.id,output.id)"
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
      inputs:WebMidi.inputs,
      outputs:WebMidi.outputs,
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
    buildLinks() {
      WebMidi.removeListener();

      this.inputs.forEach((input) => {

        input.on('noteon','all',(event) => {
          this.inNote = {
            channel: event.channel,
            name: event.note.name,
            octave: event.note.octave,
            number: event.note.number,
            velocity: event.note.velocity,
          }
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
          })

          input.on('midimessage','all', (event) => {
            if (event.data==248) {return}
            console.log(event.data, event.timestamp);  
            sendMessage({'data':event.data,'timestamp':event.timestamp});
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
