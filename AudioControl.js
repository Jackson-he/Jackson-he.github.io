class AudioControl {
  constructor({ srcArray = [], maxMum = 3, duration = 0, nameMap }) {
    this.totalArray = srcArray; // 所有播放资源路径数组
    this.playArray = []; // 当前播放数组
    this.playbackRate = 1; // 播放速率
    this.maxMum = maxMum; // 最大播放量
    this.randomMap = {}; // 数组唯一索引字典
    this.playIndex = 0; // 当前播放到第几条
    this.audioEle = null;
    this.playEle = null;
    this.resetEle = null;
    this.shuffleEle = null;
    this.duration = duration;
    this.playStatus = 0; // 0 暂停|未播放 1 播放中
    this.nameMap = nameMap;
    this.init();
  }
  // 获取两个值之间的随机值
  getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //含最大值，含最小值 
  }
  // 从一个数组中随机获取一个不重复的下标
  getUniqRandomNumOfArray() {
    const randomNum = this.getRandomIntInclusive(0, this.totalArray.length - 1);
    
    return this.randomMap[randomNum] === undefined ? this.randomMap[randomNum] = randomNum : this.getUniqRandomNumOfArray();
  }
  // 生成待播放的数组
  generatePlayArray() {
    this.randomMap = {};

    const result = new Array(this.maxMum);

    for (let i = 0; i < this.maxMum; i++) {
      const index = this.getUniqRandomNumOfArray();
      result[i] = this.totalArray[index];
    }

    console.log('play array ', result);
    
    return result;
  }
  // 替换播放流
  changeAudioSource(target, newSource) {
    target.setAttribute('src', newSource);
  }
  // 创建播放标签
  creatAudioTag(src) {
    const audioDom = document.createElement('audio');
    audioDom.setAttribute('src', src);
    audioDom.setAttribute('id', 'audio');
    return audioDom;
  }
  // 插入播放节点到DOM中
  generateAudio() {
    const audioEle = this.creatAudioTag();
    document.body.appendChild(audioEle);
  }
  // 播放/暂停
  startPlay() {
    if (this.audioEle.paused) {
      this.audioEle.play();
      this.startEle.innerText = '暂停';
      this.startEle.setAttribute('style', 'background: rgb(255, 124, 71);color: white;');
    } else {
      this.audioEle.pause();
      this.startEle.innerText = '继续';
      this.startEle.setAttribute('style', 'background: rgb(87, 193, 87);color: white;');
    }
  }
  // 播放下一条语音
  playNext() {
    this.changeAudioSource(this.audioEle, this.playArray[this.playIndex]);
    this.startPlay();
  }
  // 重置播放流
  resetPlay() {
    this.audioEle.load();
    this.resetStartBtn();
  }
  // 重置待播放源数组
  shuffleArray() {
    this.playArrayReady();
    this.generatePlayList();
    this.resetPlay();
  }
  // 复位语音流
  resetAudio() {
    this.playIndex = 0;
    this.changeAudioSource(this.audioEle, this.playArray[0]);
  }
  // 复位播放按钮
  resetStartBtn() {
    this.playStatus = 0;
    this.startEle.innerText = '播放';
    this.startEle.setAttribute('style', 'background: rgb(87, 193, 87);color: white;');
    this.resetAudio();
  }
  // 一条语音结束之后
  playOneEnded() {
    if (this.playIndex < this.playArray.length - 1) {
      this.playIndex++;
      setTimeout(() => {
        this.playNext();
      }, this.duration * 1000)
    } else {
      this.resetStartBtn();
      console.log('play ended');
    }
  }
  // 准备待播放源
  playArrayReady() {
    this.playArray = this.generatePlayArray();
  }
  setRate(e) {
    this.audioEle.playbackRate = e.target.value || 1;
  }
  // 设置播放间隔
  setDuration(e) {
    this.duration = e.target.value;
  }
  createListTag(text) {
    const pNode = document.createElement('p');
    
    
    pNode.innerText = text;
    return pNode;
  }
  generatePlayList() {
    const listNodesArray = this.playArray.reduce((result, current) => {
      const targetName = current.replace(/\.\/(\d+)\.mp3/g, (str, $1) => $1);
      
      return [...result, this.createListTag(this.nameMap[targetName])];
    }, []);
    console.log(listNodesArray);
    
    const wrapper = document.getElementById('list-wrapper');

    wrapper.innerHTML = '';

    listNodesArray.forEach((item) => wrapper.appendChild(item));
  }
  eventInit() {
    // 点击【播放】按钮
    this.startEle.addEventListener('click', this.startPlay.bind(this));
    // 点击【重置】按钮
    this.resetEle.addEventListener('click', this.resetPlay.bind(this));
    // 点击【打乱播放顺序】按钮
    this.shuffleEle.addEventListener('click', this.shuffleArray.bind(this));
    // 播放一条语音完成后的回调
    this.audioEle.addEventListener('ended', this.playOneEnded.bind(this));
    // 设置播放间隔
    this.durationInputEle.addEventListener('blur', this.setDuration.bind(this));
  }
  elementInit() {
    this.audioEle = document.getElementById('audio');
    
    this.startEle = document.getElementById('start');
    this.resetEle = document.getElementById('reset');
    this.shuffleEle = document.getElementById('shuffle');
    this.rateInputEle = document.getElementById('rateInput');
    this.durationInputEle = document.getElementById('durationInput');
  }
  init() {
    this.playArrayReady();
    this.generatePlayList();
    this.generateAudio();
    this.elementInit();
    this.eventInit();
    this.resetStartBtn();
  }
}