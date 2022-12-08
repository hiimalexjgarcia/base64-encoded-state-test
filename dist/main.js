(()=>{"use strict";var e={731:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.FORMAT_PLAIN=t.FORMAT_HTML=t.FORMATS=void 0;var n="html";t.FORMAT_HTML=n;var r="plain";t.FORMAT_PLAIN=r;var o=[n,r];t.FORMATS=o},670:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.LINE_ENDINGS=void 0,t.LINE_ENDINGS={POSIX:"\n",WIN32:"\r\n"}},3:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.SUPPORTED_PLATFORMS=void 0,t.SUPPORTED_PLATFORMS={DARWIN:"darwin",LINUX:"linux",WIN32:"win32"}},755:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.UNIT_WORDS=t.UNIT_WORD=t.UNIT_SENTENCES=t.UNIT_SENTENCE=t.UNIT_PARAGRAPHS=t.UNIT_PARAGRAPH=t.UNITS=void 0;var n="words";t.UNIT_WORDS=n;var r="word";t.UNIT_WORD=r;var o="sentences";t.UNIT_SENTENCES=o;var a="sentence";t.UNIT_SENTENCE=a;var i="paragraphs";t.UNIT_PARAGRAPHS=i;var u="paragraph";t.UNIT_PARAGRAPH=u;var d=[n,r,o,a,i,u];t.UNITS=d},749:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.WORDS=void 0,t.WORDS=["ad","adipisicing","aliqua","aliquip","amet","anim","aute","cillum","commodo","consectetur","consequat","culpa","cupidatat","deserunt","do","dolor","dolore","duis","ea","eiusmod","elit","enim","esse","est","et","eu","ex","excepteur","exercitation","fugiat","id","in","incididunt","ipsum","irure","labore","laboris","laborum","Lorem","magna","minim","mollit","nisi","non","nostrud","nulla","occaecat","officia","pariatur","proident","qui","quis","reprehenderit","sint","sit","sunt","tempor","ullamco","ut","velit","veniam","voluptate"]},380:(e,t,n)=>{Object.defineProperty(t,"Ap",{enumerable:!0,get:function(){return o.default}});n(731),n(755),n(749);var r,o=(r=n(935))&&r.__esModule?r:{default:r}},935:(e,t,n)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;var r,o=n(731),a=n(670),i=(r=n(140))&&r.__esModule?r:{default:r},u=n(270);function d(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function c(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function s(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}var l=function(){function e(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:o.FORMAT_PLAIN,r=arguments.length>2?arguments[2]:void 0;if(d(this,e),this.format=n,this.suffix=r,s(this,"generator",void 0),-1===o.FORMATS.indexOf(n.toLowerCase()))throw new Error("".concat(n," is an invalid format. Please use ").concat(o.FORMATS.join(" or "),"."));this.generator=new i.default(t)}var t,n;return t=e,(n=[{key:"getLineEnding",value:function(){return this.suffix?this.suffix:!(0,u.isReactNative)()&&(0,u.isNode)()&&(0,u.isWindows)()?a.LINE_ENDINGS.WIN32:a.LINE_ENDINGS.POSIX}},{key:"formatString",value:function(e){return this.format===o.FORMAT_HTML?"<p>".concat(e,"</p>"):e}},{key:"formatStrings",value:function(e){var t=this;return e.map((function(e){return t.formatString(e)}))}},{key:"generateWords",value:function(e){return this.formatString(this.generator.generateRandomWords(e))}},{key:"generateSentences",value:function(e){return this.formatString(this.generator.generateRandomParagraph(e))}},{key:"generateParagraphs",value:function(e){var t=this.generator.generateRandomParagraph.bind(this.generator);return this.formatStrings((0,u.makeArrayOfStrings)(e,t)).join(this.getLineEnding())}}])&&c(t.prototype,n),Object.defineProperty(t,"prototype",{writable:!1}),e}();t.default=l},140:(e,t,n)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;var r=n(749),o=n(270);function a(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}function i(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}function u(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}var d=function(){function e(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},n=t.sentencesPerParagraph,o=void 0===n?{max:7,min:3}:n,i=t.wordsPerSentence,d=void 0===i?{max:15,min:5}:i,c=t.random,s=(t.seed,t.words),l=void 0===s?r.WORDS:s;if(a(this,e),u(this,"sentencesPerParagraph",void 0),u(this,"wordsPerSentence",void 0),u(this,"random",void 0),u(this,"words",void 0),o.min>o.max)throw new Error("Minimum number of sentences per paragraph (".concat(o.min,") cannot exceed maximum (").concat(o.max,")."));if(d.min>d.max)throw new Error("Minimum number of words per sentence (".concat(d.min,") cannot exceed maximum (").concat(d.max,")."));this.sentencesPerParagraph=o,this.words=l,this.wordsPerSentence=d,this.random=c||Math.random}var t,n;return t=e,(n=[{key:"generateRandomInteger",value:function(e,t){return Math.floor(this.random()*(t-e+1)+e)}},{key:"generateRandomWords",value:function(e){var t=this,n=this.wordsPerSentence,r=n.min,a=n.max,i=e||this.generateRandomInteger(r,a);return(0,o.makeArrayOfLength)(i).reduce((function(e,n){return"".concat(t.pluckRandomWord()," ").concat(e)}),"").trim()}},{key:"generateRandomSentence",value:function(e){return"".concat((0,o.capitalize)(this.generateRandomWords(e)),".")}},{key:"generateRandomParagraph",value:function(e){var t=this,n=this.sentencesPerParagraph,r=n.min,a=n.max,i=e||this.generateRandomInteger(r,a);return(0,o.makeArrayOfLength)(i).reduce((function(e,n){return"".concat(t.generateRandomSentence()," ").concat(e)}),"").trim()}},{key:"pluckRandomWord",value:function(){var e=this.words.length-1,t=this.generateRandomInteger(0,e);return this.words[t]}}])&&i(t.prototype,n),Object.defineProperty(t,"prototype",{writable:!1}),e}();t.default=d},569:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;t.default=function(e){var t=e.trim();return t.charAt(0).toUpperCase()+t.slice(1)}},270:(e,t,n)=>{Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"capitalize",{enumerable:!0,get:function(){return r.default}}),Object.defineProperty(t,"isNode",{enumerable:!0,get:function(){return o.default}}),Object.defineProperty(t,"isReactNative",{enumerable:!0,get:function(){return a.default}}),Object.defineProperty(t,"isWindows",{enumerable:!0,get:function(){return i.default}}),Object.defineProperty(t,"makeArrayOfLength",{enumerable:!0,get:function(){return u.default}}),Object.defineProperty(t,"makeArrayOfStrings",{enumerable:!0,get:function(){return d.default}});var r=c(n(569)),o=c(n(984)),a=c(n(97)),i=c(n(606)),u=c(n(318)),d=c(n(490));function c(e){return e&&e.__esModule?e:{default:e}}},984:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;t.default=function(){return!!e.exports}},97:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;t.default=function(){var e=!1;try{e="ReactNative"===navigator.product}catch(t){e=!1}return e}},606:(e,t,n)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;var r=n(3);t.default=function(){var e=!1;try{e=process.platform===r.SUPPORTED_PLATFORMS.WIN32}catch(t){e=!1}return e}},318:(e,t)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;t.default=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0;return Array.apply(null,Array(e)).map((function(e,t){return t}))}},490:(e,t,n)=>{Object.defineProperty(t,"__esModule",{value:!0}),t.default=void 0;var r,o=(r=n(318))&&r.__esModule?r:{default:r};t.default=function(e,t){return(0,o.default)(e).map((function(){return t()}))}}},t={};function n(r){var o=t[r];if(void 0!==o)return o.exports;var a=t[r]={exports:{}};return e[r](a,a.exports,n),a.exports}(()=>{const e={randomUUID:"undefined"!=typeof crypto&&crypto.randomUUID&&crypto.randomUUID.bind(crypto)};let t;const r=new Uint8Array(16);function o(){if(!t&&(t="undefined"!=typeof crypto&&crypto.getRandomValues&&crypto.getRandomValues.bind(crypto),!t))throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");return t(r)}const a=[];for(let e=0;e<256;++e)a.push((e+256).toString(16).slice(1));const i=function(t,n,r){if(e.randomUUID&&!n&&!t)return e.randomUUID();const i=(t=t||{}).random||(t.rng||o)();if(i[6]=15&i[6]|64,i[8]=63&i[8]|128,n){r=r||0;for(let e=0;e<16;++e)n[r+e]=i[e];return n}return function(e,t=0){return(a[e[t+0]]+a[e[t+1]]+a[e[t+2]]+a[e[t+3]]+"-"+a[e[t+4]]+a[e[t+5]]+"-"+a[e[t+6]]+a[e[t+7]]+"-"+a[e[t+8]]+a[e[t+9]]+"-"+a[e[t+10]]+a[e[t+11]]+a[e[t+12]]+a[e[t+13]]+a[e[t+14]]+a[e[t+15]]).toLowerCase()}(i)};var u=n(380);const d=function(){const e=new Proxy({count:0,notes:[]},{set:(t,n,r)=>(t[n]=r,window.location.hash="#/"+btoa(JSON.stringify(e)),!0)});return{state:{getEncoded:()=>btoa(JSON.stringify(e)),setEncoded:t=>Object.assign(e,JSON.parse(atob(t)))},counter:{increment:()=>e.count+=1,decrement:()=>e.count-=1,get:()=>e.count},notes:{getAll:()=>[...e.notes],add:t=>{e.notes=[...e.notes,t]},remove:t=>{e.notes=e.notes.filter((e=>e!==t))}}}}(),c=document.getElementById("counterDisplay"),s=document.getElementById("counterButtonDecrement");document.getElementById("counterButtonIncrement").addEventListener("click",(()=>d.counter.increment()),!1),s.addEventListener("click",(()=>d.counter.decrement()),!1),window.addEventListener("hashchange",(()=>{c.innerHTML=d.counter.get()}),!1);const l=new u.Ap,f=document.getElementById("notesContainer"),m=document.getElementById("notesButtonAdd"),p=document.getElementById("notesDisplayCount"),v=document.getElementById("noteTemplate").content;m.addEventListener("click",(()=>{d.notes.add({id:i(),title:l.generateSentences(1),body:Math.floor(2*Math.random())?l.generateParagraphs(1):void 0})}),!1),window.addEventListener("hashchange",(()=>{const e=document.createElement("div");d.notes.getAll().forEach((t=>{const n=v.firstElementChild.cloneNode(!0),r=n.querySelector("button"),o=n.querySelector(".card-title"),a=n.querySelector(".card-text");n.dataset.id=t.id,o.innerHTML=t.title,t.body&&(a.innerHTML=t.body),r.addEventListener("click",(e=>{const t=e.target.parentNode.parentNode.parentNode.dataset.id,n=d.notes.getAll().find((e=>e.id===t));d.notes.remove(n)})),e.appendChild(n)})),f.replaceChildren(e),p.innerHTML=`${d.notes.getAll().length} notes`}),!1),document.getElementById("buttonCopyURL").addEventListener("click",(()=>{navigator.clipboard.writeText(location.href)}),!1);try{d.state.setEncoded(window.location.hash.substring(2)),window.dispatchEvent(new HashChangeEvent("hashchange"))}catch(e){console.error(e),d.state.setEncoded("eyJjb3VudCI6MCwibm90ZXMiOltdfQ==")}})()})();