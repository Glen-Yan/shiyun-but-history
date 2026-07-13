/**
 * 示例数据 — 精选 60 位中国历史名人 + 关系网络
 * 用于开发阶段，不需要 CBDB 即可运行
 * 覆盖先秦到民国，包含多种关系类型
 */
import type { Manifest, PersonIndex, PersonRecord, RelationEdge } from "./contract";

// ── 精简的人物索引（60 人）──────────────────────────────────────────
export const SAMPLE_INDEX: PersonIndex[] = [
  // 先秦
  { id:"confucius", name:"孔子",   dynasty:"xianqin", indexYear:-510, birthYear:-551, deathYear:-479, importance:100, clusterSize:9.5 },
  { id:"laozi",     name:"老子",   dynasty:"xianqin", indexYear:-530, birthYear:-571, deathYear:-471, importance:85,  clusterSize:8.8 },
  { id:"mengzi",    name:"孟子",   dynasty:"xianqin", indexYear:-310, birthYear:-372, deathYear:-289, importance:80,  clusterSize:8.5 },
  { id:"zhuangzi",  name:"庄子",   dynasty:"xianqin", indexYear:-330, birthYear:-369, deathYear:-286, importance:78,  clusterSize:8.4 },
  { id:"xunzi",     name:"荀子",   dynasty:"xianqin", indexYear:-270, birthYear:-313, deathYear:-238, importance:65,  clusterSize:7.7 },
  { id:"quyuan",    name:"屈原",   dynasty:"xianqin", indexYear:-290, birthYear:-340, deathYear:-278, importance:82,  clusterSize:8.6 },
  { id:"hanfeizi",  name:"韩非子", dynasty:"xianqin", indexYear:-240, birthYear:-280, deathYear:-233, importance:60,  clusterSize:7.4 },
  // 秦
  { id:"qinshihuang",name:"秦始皇", dynasty:"qin",    indexYear:-215, birthYear:-259, deathYear:-210, importance:95,  clusterSize:9.3 },
  { id:"lisigu",    name:"李斯",   dynasty:"qin",     indexYear:-215, birthYear:-280, deathYear:-208, importance:55,  clusterSize:7.1 },
  // 汉
  { id:"liubanggu", name:"刘邦",   dynasty:"han",     indexYear:-190, birthYear:-256, deathYear:-195, importance:90,  clusterSize:9.1 },
  { id:"simaqian",  name:"司马迁", dynasty:"han",     indexYear:-90,  birthYear:-145, deathYear:-86,  importance:92,  clusterSize:9.2 },
  { id:"zhangheng", name:"张衡",   dynasty:"han",     indexYear:100,  birthYear:78,   deathYear:139,  importance:70,  clusterSize:8.0 },
  // 魏晋
  { id:"caocao",    name:"曹操",   dynasty:"weijin",  indexYear:200,  birthYear:155,  deathYear:220,  importance:88,  clusterSize:9.0 },
  { id:"wangxizhi", name:"王羲之", dynasty:"weijin",  indexYear:350,  birthYear:303,  deathYear:361,  importance:72,  clusterSize:8.1 },
  { id:"taoyuanming",name:"陶渊明", dynasty:"weijin", indexYear:400,  birthYear:365,  deathYear:427,  importance:75,  clusterSize:8.3 },
  // 唐
  { id:"libai",     name:"李白",   dynasty:"tang",    indexYear:740,  birthYear:701,  deathYear:762,  importance:100, clusterSize:9.5 },
  { id:"dufu",      name:"杜甫",   dynasty:"tang",    indexYear:755,  birthYear:712,  deathYear:770,  importance:98,  clusterSize:9.4 },
  { id:"baijuyi",   name:"白居易", dynasty:"tang",    indexYear:800,  birthYear:772,  deathYear:846,  importance:88,  clusterSize:9.0 },
  { id:"hanwengong",name:"韩愈",   dynasty:"tang",    indexYear:800,  birthYear:768,  deathYear:824,  importance:82,  clusterSize:8.6 },
  { id:"liushang",  name:"柳宗元", dynasty:"tang",    indexYear:800,  birthYear:773,  deathYear:819,  importance:75,  clusterSize:8.3 },
  { id:"wangwei",   name:"王维",   dynasty:"tang",    indexYear:730,  birthYear:701,  deathYear:761,  importance:78,  clusterSize:8.4 },
  { id:"lishangyin",name:"李商隐", dynasty:"tang",    indexYear:840,  birthYear:813,  deathYear:858,  importance:72,  clusterSize:8.1 },
  // 宋
  { id:"sushi",     name:"苏轼",   dynasty:"song",    indexYear:1060, birthYear:1037, deathYear:1101, importance:100, clusterSize:9.5 },
  { id:"wanganshi", name:"王安石", dynasty:"song",    indexYear:1060, birthYear:1021, deathYear:1086, importance:90,  clusterSize:9.1 },
  { id:"ouyangxiu", name:"欧阳修", dynasty:"song",    indexYear:1040, birthYear:1007, deathYear:1072, importance:85,  clusterSize:8.8 },
  { id:"simaqiangso",name:"司马光",dynasty:"song",    indexYear:1060, birthYear:1019, deathYear:1086, importance:82,  clusterSize:8.6 },
  { id:"zhuxi",     name:"朱熹",   dynasty:"song",    indexYear:1170, birthYear:1130, deathYear:1200, importance:80,  clusterSize:8.5 },
  { id:"liqingzhao",name:"李清照", dynasty:"song",    indexYear:1110, birthYear:1084, deathYear:1155, importance:78,  clusterSize:8.4 },
  { id:"xinqiji",   name:"辛弃疾", dynasty:"song",    indexYear:1180, birthYear:1140, deathYear:1207, importance:75,  clusterSize:8.3 },
  { id:"luyou",     name:"陆游",   dynasty:"song",    indexYear:1170, birthYear:1125, deathYear:1210, importance:76,  clusterSize:8.3 },
  { id:"fangzhongyan",name:"范仲淹",dynasty:"song",   indexYear:1020, birthYear:989,  deathYear:1052, importance:72,  clusterSize:8.1 },
  // 元
  { id:"guanhanqing",name:"关汉卿", dynasty:"yuan",   indexYear:1280, birthYear:1210, deathYear:1300, importance:65,  clusterSize:7.7 },
  { id:"zhaomengfu",name:"赵孟頫", dynasty:"yuan",    indexYear:1290, birthYear:1254, deathYear:1322, importance:60,  clusterSize:7.4 },
  // 明
  { id:"zhuyuanzhang",name:"朱元璋",dynasty:"ming",   indexYear:1370, birthYear:1328, deathYear:1398, importance:92,  clusterSize:9.2 },
  { id:"wangyangming",name:"王阳明",dynasty:"ming",   indexYear:1510, birthYear:1472, deathYear:1529, importance:88,  clusterSize:9.0 },
  { id:"zhangjuzheng",name:"张居正",dynasty:"ming",   indexYear:1570, birthYear:1525, deathYear:1582, importance:80,  clusterSize:8.5 },
  { id:"tangxianzu",name:"汤显祖", dynasty:"ming",    indexYear:1590, birthYear:1550, deathYear:1616, importance:70,  clusterSize:8.0 },
  { id:"xuxiake",   name:"徐霞客", dynasty:"ming",    indexYear:1610, birthYear:1587, deathYear:1641, importance:60,  clusterSize:7.4 },
  { id:"zhangdai",  name:"张岱",   dynasty:"ming",    indexYear:1630, birthYear:1597, deathYear:1679, importance:55,  clusterSize:7.1 },
  // 清
  { id:"kangxi",    name:"康熙",   dynasty:"qing",    indexYear:1690, birthYear:1654, deathYear:1722, importance:94,  clusterSize:9.3 },
  { id:"caoxueqin", name:"曹雪芹", dynasty:"qing",    indexYear:1750, birthYear:1715, deathYear:1763, importance:85,  clusterSize:8.8 },
  { id:"jixiaolan", name:"纪昀",   dynasty:"qing",    indexYear:1770, birthYear:1724, deathYear:1805, importance:65,  clusterSize:7.7 },
  { id:"zhengxie",  name:"郑燮",   dynasty:"qing",    indexYear:1750, birthYear:1693, deathYear:1765, importance:62,  clusterSize:7.5 },
  { id:"zengguofan",name:"曾国藩", dynasty:"qing",    indexYear:1850, birthYear:1811, deathYear:1872, importance:80,  clusterSize:8.5 },
  { id:"lizhongtang",name:"李鸿章",dynasty:"qing",    indexYear:1870, birthYear:1823, deathYear:1901, importance:78,  clusterSize:8.4 },
  { id:"kangyouwei",name:"康有为", dynasty:"qing",    indexYear:1890, birthYear:1858, deathYear:1927, importance:70,  clusterSize:8.0 },
  { id:"liangqichao",name:"梁启超",dynasty:"qing",    indexYear:1895, birthYear:1873, deathYear:1929, importance:75,  clusterSize:8.3 },
  // 民国
  { id:"luxun",     name:"鲁迅",   dynasty:"minguo",  indexYear:1925, birthYear:1881, deathYear:1936, importance:90,  clusterSize:9.1 },
  { id:"hushi",     name:"胡适",   dynasty:"minguo",  indexYear:1925, birthYear:1891, deathYear:1962, importance:78,  clusterSize:8.4 },
  { id:"chenyinke", name:"陈寅恪", dynasty:"minguo",  indexYear:1930, birthYear:1890, deathYear:1969, importance:65,  clusterSize:7.7 },
  // 当代
  { id:"qianzhongshu",name:"钱钟书",dynasty:"dangdai",indexYear:1960, birthYear:1910, deathYear:1998, importance:60, clusterSize:7.4 },
];

// ── 关系网络（60+ 条边）──────────────────────────────────────────
export const SAMPLE_RELATIONS: RelationEdge[] = [
  // 师生关系
  { from:"confucius", to:"mengzi",    type:"teacher_student", label:"儒家传承", source:"史记" },
  { from:"confucius", to:"xunzi",     type:"teacher_student", label:"儒家传承", source:"史记" },
  { from:"xunzi",     to:"hanfeizi",  type:"teacher_student", label:"法家源流", source:"史记" },
  { from:"xunzi",     to:"lisigu",    type:"teacher_student", label:"法家源流", source:"史记" },
  { from:"hanwengong",to:"liushang",  type:"teacher_student", label:"古文运动", source:"旧唐书" },
  { from:"ouyangxiu", to:"sushi",     type:"teacher_student", label:"座主门生", source:"宋史" },
  { from:"sushi",     to:"huangtingjian",type:"teacher_student",label:"苏门四学士",source:"宋史" },
  { from:"zhuxi",     to:"luyou",     type:"academic",        label:"学术交流", source:"宋元学案" },
  { from:"kangyouwei",to:"liangqichao",type:"teacher_student",label:"维新师生", source:"清史稿" },
  // 交往关系
  { from:"libai",     to:"dufu",      type:"friend",          label:"诗友",     source:"唐诗纪事" },
  { from:"baijuyi",   to:"liushang",  type:"friend",          label:"唱和",     source:"全唐诗" },
  { from:"hanwengong",to:"baijuyi",   type:"friend",          label:"文学交游", source:"旧唐书" },
  { from:"sushi",     to:"wanganshi", type:"political",       label:"新旧党争", source:"宋史" },
  { from:"sushi",     to:"simaqiangso",type:"political",      label:"新旧党争", source:"宋史" },
  { from:"ouyangxiu", to:"wanganshi", type:"political",       label:"庆历新政", source:"宋史" },
  { from:"ouyangxiu", to:"fangzhongyan",type:"political",     label:"庆历新政", source:"宋史" },
  { from:"wanganshi", to:"simaqiangso",type:"political",      label:"新旧党争", source:"宋史" },
  { from:"wangwei",   to:"dufu",      type:"friend",          label:"诗画之交", source:"唐才子传" },
  { from:"baijuyi",   to:"wangwei",   type:"academic",        label:"仰慕前贤", source:"白氏长庆集" },
  { from:"zengguofan",to:"lizhongtang",type:"teacher_student",label:"湘军幕僚", source:"清史稿" },
  { from:"zengguofan",to:"kangyouwei",type:"academic",        label:"经世致用", source:"清儒学案" },
  { from:"luxun",     to:"hushi",     type:"academic",        label:"新文化运动",source:null },
  { from:"liangqichao",to:"hushi",    type:"academic",        label:"学术论争", source:null },
  { from:"wangyangming",to:"zhuxi",   type:"academic",        label:"理学心学", source:"明儒学案" },
  // 亲属关系
  { from:"sushi",     to:"suzhe",     type:"kinship",         label:"兄弟",     source:"宋史" },
  { from:"caocao",    to:"caozhi",    type:"kinship",         label:"父子",     source:"三国志" },
  // 同僚关系
  { from:"zhangjuzheng",to:"wangyangming",type:"political",   label:"改革承继", source:"明史" },
  { from:"simaqian",  to:"zhangheng", type:"academic",        label:"史传天文", source:null },
  { from:"zhengxie",  to:"caoxueqin", type:"friend",          label:"扬州八怪", source:null },
];

// ── 人物详情（少量生卒年不详的补为 null）────────────────────────
export const SAMPLE_DETAILS: Record<string, PersonRecord> = {
  confucius:  { id:"confucius", name:"孔子",   dynasty:"xianqin",birthYear:-551,deathYear:-479,indexYear:-510,gender:0,nativePlace:"鲁国陬邑", offices:[],statuses:["思想家","教育家","儒家创始人"],works:["论语","春秋","诗经(编)"] },
  libai:      { id:"libai",     name:"李白",   dynasty:"tang",   birthYear:701, deathYear:762, indexYear:740, gender:0,nativePlace:"碎叶/绵州", offices:[{title:"翰林供奉",place:"长安",startYear:742,endYear:744}],statuses:["诗人","剑客","道士"],works:["将进酒","蜀道难","静夜思","行路难"] },
  dufu:       { id:"dufu",      name:"杜甫",   dynasty:"tang",   birthYear:712, deathYear:770, indexYear:755, gender:0,nativePlace:"河南巩县", offices:[{title:"左拾遗",place:"长安",startYear:757,endYear:759},{title:"工部员外郎",place:"成都",startYear:764,endYear:765}],statuses:["诗人","诗圣"],works:["春望","登高","茅屋为秋风所破歌","三吏三别"] },
  sushi:      { id:"sushi",     name:"苏轼",   dynasty:"song",   birthYear:1037,deathYear:1101,indexYear:1060,gender:0,nativePlace:"眉州眉山", offices:[{title:"翰林学士",place:"汴京",startYear:1086,endYear:1089},{title:"杭州通判",place:"杭州",startYear:1071,endYear:1074}],statuses:["文学家","书画家","美食家"],works:["赤壁赋","念奴娇·赤壁怀古","水调歌头","题西林壁"] },
  wanganshi:  { id:"wanganshi", name:"王安石", dynasty:"song",   birthYear:1021,deathYear:1086,indexYear:1060,gender:0,nativePlace:"抚州临川", offices:[{title:"宰相",place:"汴京",startYear:1069,endYear:1076}],statuses:["政治家","文学家","改革家"],works:["临川先生文集","泊船瓜洲","元日"] },
  zhuxi:      { id:"zhuxi",     name:"朱熹",   dynasty:"song",   birthYear:1130,deathYear:1200,indexYear:1170,gender:0,nativePlace:"福建尤溪", offices:[{title:"焕章阁待制",place:"临安",startYear:1194,endYear:1196}],statuses:["理学家","教育家"],works:["四书章句集注","近思录","朱子语类"] },
  luxun:      { id:"luxun",     name:"鲁迅",   dynasty:"minguo", birthYear:1881,deathYear:1936,indexYear:1925,gender:0,nativePlace:"浙江绍兴", offices:[],statuses:["文学家","思想家","革命家"],works:["呐喊","彷徨","朝花夕拾","狂人日记"] },
  caoxueqin:  { id:"caoxueqin", name:"曹雪芹", dynasty:"qing",   birthYear:1715,deathYear:1763,indexYear:1750,gender:0,nativePlace:"江宁", offices:[],statuses:["小说家"],works:["红楼梦"] },
  simaqian:   { id:"simaqian",  name:"司马迁", dynasty:"han",    birthYear:-145,deathYear:-86, indexYear:-90, gender:0,nativePlace:"夏阳龙门", offices:[{title:"太史令",place:"长安",startYear:-108,endYear:-90}],statuses:["史学家","文学家"],works:["史记"] },
  qinshihuang:{ id:"qinshihuang",name:"秦始皇", dynasty:"qin",   birthYear:-259,deathYear:-210,indexYear:-215,gender:0,nativePlace:"邯郸", offices:[],statuses:["皇帝","统一者"],works:["统一度量衡","书同文车同轨"] },
};

// 为 SAMPLE_DETAILS 没覆盖的人生成默认详情
for (const p of SAMPLE_INDEX) {
  if (!SAMPLE_DETAILS[p.id]) {
    SAMPLE_DETAILS[p.id] = {
      id: p.id, name: p.name, dynasty: p.dynasty,
      birthYear: p.birthYear, deathYear: p.deathYear, indexYear: p.indexYear,
      gender: 0, nativePlace: null, offices: [], statuses: [], works: []
    };
  }
}

/** 示例 manifest */
export const SAMPLE_MANIFEST: Manifest = {
  version: 0,
  personCount: SAMPLE_INDEX.length,
  relationCount: SAMPLE_RELATIONS.length,
  dynastyKeys: [...new Set(SAMPLE_INDEX.map(p => p.dynasty))],
  shardSize: 200,
  shardCount: 1,
};
