// 书籍类型常量
const BOOK_TYPES = [
  { label: '玄幻', value: 'xuanhua' },
  { label: '仙侠', value: 'xianxia' },
  { label: '奇幻', value: 'qihuan' },
  { label: '都市', value: 'dushi' },
  { label: '科幻', value: 'kehuan' },
  { label: '武侠', value: 'wuxia' },
  { label: '言情', value: 'yanqing' },
  { label: '历史', value: 'lishi' },
  { label: '悬疑', value: 'xuanyi' },
  { label: '军事', value: 'junshi' },
  { label: '游戏', value: 'youxi' },
  { label: '体育', value: 'tiyu' },
  { label: '现实', value: 'xianshi' },
  { label: '同人', value: 'tongren' },
  { label: '青春', value: 'qingchun' },
  { label: '职场', value: 'zhichang' },
  { label: '校园', value: 'xiaoyuan' },
  { label: '二次元', value: 'erciyuan' },
  { label: '轻小说', value: 'qingxiaoshuo' },
  { label: '短篇', value: 'duanpian' },
  { label: '其他', value: 'other' }
]

// 百家姓（单姓，部分示例，建议全量）
const CHINESE_SURNAMES = [
  '赵',
  '钱',
  '孙',
  '李',
  '周',
  '吴',
  '郑',
  '王',
  '冯',
  '陈',
  '褚',
  '卫',
  '蒋',
  '沈',
  '韩',
  '杨',
  '朱',
  '秦',
  '尤',
  '许',
  '何',
  '吕',
  '施',
  '张',
  '孔',
  '曹',
  '严',
  '华',
  '金',
  '魏',
  '陶',
  '姜',
  '戚',
  '谢',
  '邹',
  '喻',
  '柏',
  '水',
  '窦',
  '章',
  '云',
  '苏',
  '潘',
  '葛',
  '奚',
  '范',
  '彭',
  '郎',
  '鲁',
  '韦',
  '昌',
  '马',
  '苗',
  '凤',
  '花',
  '方',
  '俞',
  '任',
  '袁',
  '柳',
  '酆',
  '鲍',
  '史',
  '唐',
  '费',
  '廉',
  '岑',
  '薛',
  '雷',
  '贺',
  '倪',
  '汤',
  '滕',
  '殷',
  '罗',
  '毕',
  '郝',
  '邬',
  '安',
  '常',
  '乐',
  '于',
  '时',
  '傅',
  '皮',
  '卞',
  '齐',
  '康',
  '伍',
  '余',
  '元',
  '卜',
  '顾',
  '孟',
  '平',
  '黄',
  '和',
  '穆',
  '萧',
  '尹',
  '姚',
  '邵',
  '湛',
  '汪',
  '祁',
  '毛',
  '禹',
  '狄',
  '米',
  '贝',
  '明',
  '臧',
  '计',
  '伏',
  '成',
  '戴',
  '谈',
  '宋',
  '茅',
  '庞',
  '熊',
  '纪',
  '舒',
  '屈',
  '项',
  '祝',
  '董',
  '梁',
  '杜',
  '阮',
  '蓝',
  '闵',
  '席',
  '季',
  '麻',
  '强',
  '贾',
  '路',
  '娄',
  '危',
  '江',
  '童',
  '颜',
  '郭',
  '梅',
  '盛',
  '林',
  '刁',
  '钟',
  '徐',
  '邱',
  '骆',
  '高',
  '夏',
  '蔡',
  '田',
  '樊',
  '胡',
  '凌',
  '霍',
  '虞',
  '万',
  '支',
  '柯',
  '昝',
  '管',
  '卢',
  '莫',
  '经',
  '房',
  '裘',
  '缪',
  '干',
  '解',
  '应',
  '宗',
  '丁',
  '宣',
  '贲',
  '邓',
  '郁',
  '单',
  '杭',
  '洪',
  '包',
  '诸',
  '左',
  '石',
  '崔',
  '吉',
  '钮',
  '龚',
  '程',
  '嵇',
  '邢',
  '滑',
  '裴',
  '陆',
  '荣',
  '翁',
  '荀',
  '羊',
  '於',
  '惠',
  '甄',
  '曲',
  '家',
  '封',
  '芮',
  '羿',
  '储',
  '靳',
  '汲',
  '邴',
  '糜',
  '松',
  '井',
  '段',
  '富',
  '巫',
  '乌',
  '焦',
  '巴',
  '弓',
  '牧',
  '隗',
  '山',
  '谷',
  '车',
  '侯',
  '宓',
  '蓬',
  '全',
  '郗',
  '班',
  '仰',
  '秋',
  '仲',
  '伊',
  '宫',
  '宁',
  '仇',
  '栾',
  '暴',
  '甘',
  '钭',
  '厉',
  '戎',
  '祖',
  '武',
  '符',
  '刘',
  '景',
  '詹',
  '束',
  '龙',
  '叶',
  '幸',
  '司',
  '韶',
  '郜',
  '黎',
  '蓟',
  '薄',
  '印',
  '宿',
  '白',
  '怀',
  '蒲',
  '邰',
  '从',
  '鄂',
  '索',
  '咸',
  '籍',
  '赖',
  '卓',
  '蔺',
  '屠',
  '蒙',
  '池',
  '乔',
  '阴',
  '郁',
  '胥',
  '能',
  '苍',
  '双',
  '闻',
  '莘',
  '党',
  '翟',
  '谭',
  '贡',
  '劳',
  '逄',
  '姬',
  '申',
  '扶',
  '堵',
  '冉',
  '宰',
  '郦',
  '雍',
  '却',
  '璩',
  '桑',
  '桂',
  '濮',
  '牛',
  '寿',
  '通',
  '边',
  '扈',
  '燕',
  '冀',
  '郏',
  '浦',
  '尚',
  '农',
  '温',
  '别',
  '庄',
  '晏',
  '柴',
  '瞿',
  '阎',
  '充',
  '慕',
  '连',
  '茹',
  '习',
  '宦',
  '艾',
  '鱼',
  '容',
  '向',
  '古',
  '易',
  '慎',
  '戈',
  '廖',
  '庾',
  '终',
  '暨',
  '居',
  '衡',
  '步',
  '都',
  '耿',
  '满',
  '弘',
  '匡',
  '国',
  '文',
  '寇',
  '广',
  '禄',
  '阙',
  '东',
  '欧',
  '殳',
  '沃',
  '利',
  '蔚',
  '越',
  '夔',
  '隆',
  '师',
  '巩',
  '厍',
  '聂',
  '晁',
  '勾',
  '敖',
  '融',
  '冷',
  '訾',
  '辛',
  '阚',
  '那',
  '简',
  '饶',
  '空',
  '曾',
  '毋',
  '沙',
  '乜',
  '养',
  '鞠',
  '须',
  '丰',
  '巢',
  '关',
  '蒯',
  '相',
  '查',
  '后',
  '荆',
  '红',
  '游',
  '竺',
  '权',
  '逯',
  '盖',
  '益',
  '桓',
  '公',
  '仉',
  '督',
  '岳',
  '帅',
  '缑',
  '亢',
  '况',
  '郈',
  '有',
  '琴',
  '归',
  '海',
  '晋',
  '楚',
  '闫',
  '法',
  '汝',
  '鄢',
  '涂',
  '钦'
]

// 常见复姓
const CHINESE_COMPOUND_SURNAMES = [
  '欧阳',
  '太史',
  '端木',
  '上官',
  '司马',
  '东方',
  '独孤',
  '南宫',
  '万俟',
  '闻人',
  '夏侯',
  '诸葛',
  '尉迟',
  '公羊',
  '赫连',
  '澹台',
  '皇甫',
  '宗政',
  '濮阳',
  '公冶',
  '太叔',
  '申屠',
  '公孙',
  '慕容',
  '仲孙',
  '钟离',
  '长孙',
  '宇文',
  '司徒',
  '鲜于',
  '司空',
  '闾丘',
  '子车',
  '亓官',
  '司寇',
  '巫马',
  '公西',
  '颛孙',
  '壤驷',
  '公良',
  '漆雕',
  '乐正',
  '宰父',
  '谷梁',
  '拓跋',
  '夹谷',
  '轩辕',
  '令狐',
  '段干',
  '百里',
  '呼延',
  '东郭',
  '南门',
  '羊舌',
  '微生',
  '公户',
  '公玉',
  '公仪',
  '梁丘',
  '公仲',
  '公上',
  '公门',
  '公山',
  '公坚',
  '左丘',
  '公伯',
  '西门',
  '公祖',
  '第五',
  '公乘',
  '贯丘',
  '公皙',
  '南荣',
  '东里',
  '东宫',
  '仲长',
  '子书',
  '子桑',
  '即墨',
  '达奚',
  '褚师'
]

// 男名用字
const CHINESE_MALE_CHARS =
  '伟强军洋勇峰超杰涛明辉刚健毅俊鹏宇浩博志文华国龙建平亮鑫森山川海天星辰阳光风云雨雷电火炎晶玉玺银铜铁剑胆识睿哲翰墨澜沧擎宇拓疆浩然正气浩瀚乾坤志远弘毅博瀚睿智思景行维贤怀瑾握瑜秉德含章明哲保身谦谦君子温润如玉齐翰飞卓然冠宇承轩墨安瞻衿瑜建期渊谦睿思文沧擎拓浩瀚弘博智齐飞冠凌泽星景维笃志怀瑾握瑜秉德含章天湛卢云舟帆济野皓源承启明保身笃行致远谦磊森林焱石金银钢锋锐利刀戈矛盾甲铠战斗胜利功勋荣耀辉煌灿烂炫丽美好善良德仁义礼智信忠孝节勇毅刚强坚韧恒久远大高深广宽阔宽厚重实真诚信义理智慧聪明达通晓知识学问思想念忆记虑谋划策略计算数量度衡量统计筹'

// 女名用字
const CHINESE_FEMALE_CHARS =
  '芳娜秀英华慧巧美玉兰云莲真环雪荣爱妹霞香月莺媛艳瑞凡佳嘉琼勤珍贞莉桂嫦娥芷若芙蕖菁清扬婉兮巧笑倩美目盼静女其姝蒹葭苍露为霜所谓伊人在水一方敏柔娩婌娥皇婵姮弄飞燕惊鸿紫嫣桃雅淑惠夭灼华敏柔娩婌娥皇婵姮弄飞燕惊鸿紫嫣桃夭灼华娣叶璧璐娅琦晶妍茜秋珊莎锦黛青倩婷宁蓓纨仪荷丹蓉眉君琴蕊薇梦岚苑婕馨瑗琰韵融园艺咏卿聪澜纯毓悦昭冰爽琬茗羽希欣飘育滢馥筠柔竹霭凝晓欢霄枫芸菲寒伊亚宜可姬舒影荔思丽娟'

// 日本人名用字
const JAPANESE_SURNAMES = [
  '佐藤',
  '铃木',
  '高桥',
  '田中',
  '渡边',
  '伊藤',
  '中村',
  '小林',
  '加藤',
  '吉田',
  '山田',
  '佐佐木',
  '山口',
  '松本',
  '井上',
  '木村',
  '林',
  '清水',
  '山本',
  '森',
  '池田',
  '桥本',
  '石川',
  '前田',
  '后藤',
  '近藤',
  '村上',
  '远藤',
  '青木',
  '藤田',
  '冈田',
  '长谷川',
  '中川',
  '原田',
  '小川',
  '坂本',
  '宫崎',
  '阿部',
  '福田',
  '太田',
  '藤井',
  '西村',
  '藤原',
  '本田',
  '久保',
  '松田',
  '野村',
  '松井',
  '千叶',
  '岩崎',
  '菅原',
  '木下',
  '新井',
  '野口',
  '渡部',
  '酒井',
  '高木',
  '菊地',
  '竹内',
  '安藤',
  '宫本',
  '田村',
  '今井',
  '河野',
  '藤本',
  '村田',
  '武田',
  '上田',
  '杉山',
  '增田',
  '大野',
  '平野',
  '工藤',
  '中岛',
  '丸山',
  '早川',
  '横山',
  '内田',
  '高田',
  '松尾',
  '三浦',
  '冈本',
  '小岛',
  '新田',
  '上野',
  '荒木',
  '大冢',
  '平田',
  '星野',
  '大西',
  '小野',
  '田口',
  '宫田',
  '金子',
  '中野',
  '村山',
  '石井',
  '杉本',
  '吉村',
  '小山',
  '藤野',
  '中岛',
  '小松',
  '大谷',
  '高野',
  '松井',
  '野田',
  '大西',
  '小川',
  '中村',
  '山崎',
  '大野',
  '松田',
  '中川',
  '小野',
  '大冢',
  '高桥',
  '小林',
  '田中',
  '佐藤',
  '铃木',
  '伊藤',
  '渡边',
  '山本',
  '中村',
  '小林',
  '加藤',
  '吉田',
  '山田',
  '佐佐木',
  '山口',
  '松本',
  '井上',
  '木村',
  '林',
  '清水',
  '山本',
  '森',
  '池田',
  '桥本',
  '石川',
  '前田',
  '后藤',
  '近藤',
  '村上',
  '远藤',
  '青木',
  '藤田',
  '冈田',
  '长谷川'
]

// 日本人男名用字
const JAPANESE_MALE_CHARS = [
  '太郎',
  '翔',
  '健',
  '悠斗',
  '海斗',
  '阳斗',
  '莲',
  '陆',
  '隼人',
  '大和',
  '翼',
  '大辉',
  '悠真',
  '阳太',
  '大空',
  '太阳',
  '大翔',
  '悠太',
  '阳向',
  '大智',
  '悠人',
  '和也',
  '直树',
  '拓海',
  '翔太',
  '大辅',
  '一郎',
  '贤一',
  '诚',
  '和夫',
  '浩',
  '明',
  '刚',
  '勇',
  '达也',
  '健太',
  '俊介',
  '优',
  '直人',
  '亮',
  '淳',
  '诚一',
  '隆',
  '贵之',
  '智也',
  '悠',
  '圭',
  '悠生',
  '悠希',
  '悠翔',
  '诚司',
  '贵志',
  '智',
  '诚二',
  '和彦',
  '直哉',
  '优作',
  '优真',
  '优斗',
  '优太',
  '优树',
  '优雅',
  '优贵',
  '优悟',
  '优平',
  '优晖',
  '优志',
  '优纪',
  '优吾',
  '优成',
  '优治',
  '优仁',
  '优一',
  '优二',
  '优三',
  '优四',
  '优五',
  '优六',
  '优七',
  '优八',
  '优九',
  '优十',
  '大志',
  '大树',
  '大贵',
  '大悟',
  '大平',
  '大晖',
  '大纪',
  '大吾',
  '大作',
  '大司',
  '大成',
  '大治',
  '大仁',
  '大一',
  '大二',
  '大三',
  '大四',
  '大五',
  '大六',
  '大七',
  '大八',
  '大九',
  '大十',
  '健一',
  '健二',
  '健三',
  '健四',
  '健五',
  '健六',
  '健七',
  '健八',
  '健九',
  '健十',
  '翔一',
  '翔二',
  '翔三',
  '翔四',
  '翔五',
  '翔六',
  '翔七',
  '翔八',
  '翔九',
  '翔十',
  '直也',
  '直幸',
  '直行',
  '直弘',
  '直明',
  '直隆',
  '直贵',
  '直悟',
  '悠介',
  '悠希',
  '悠树',
  '悠雅',
  '悠贵',
  '悠悟',
  '悠平',
  '悠晖',
  '悠志',
  '悠纪',
  '悠吾',
  '悠作',
  '悠司',
  '悠成',
  '悠治',
  '悠仁',
  '隼',
  '诚人',
  '诚太',
  '诚也',
  '诚吾',
  '诚树',
  '诚志',
  '诚贵',
  '诚平',
  '诚晖',
  '诚纪',
  '诚悟',
  '诚成',
  '诚治',
  '诚仁',
  '贵树',
  '贵志',
  '贵纪',
  '贵悟',
  '贵成',
  '贵治',
  '贵仁',
  '智树',
  '智志',
  '智纪',
  '智悟',
  '智成',
  '智治',
  '智仁',
  '圭介',
  '圭吾',
  '圭树',
  '圭志',
  '圭纪',
  '圭悟',
  '圭成',
  '圭治',
  '圭仁',
  '悠一',
  '悠二',
  '悠三',
  '悠四',
  '悠五',
  '悠六',
  '悠七',
  '悠八',
  '悠九',
  '悠十'
]

// 日本人女名用字
const JAPANESE_FEMALE_CHARS = [
  '美咲',
  '葵',
  '结衣',
  '樱',
  '花',
  '爱',
  '优',
  '真由',
  '沙织',
  '千夏',
  '美月',
  '莉子',
  '明子',
  '秋子',
  '香',
  '香织',
  '佳绪',
  '香澄',
  '美香',
  '美穗',
  '美沙',
  '美智子',
  '美和',
  '美佳',
  '美纪',
  '美奈',
  '美雪',
  '美智',
  '美希',
  '美纱',
  '彩乃',
  '彩花',
  '彩音',
  '彩香',
  '彩芽',
  '彩夏',
  '彩美',
  '彩奈',
  '彩月',
  '彩咲',
  '优花',
  '优奈',
  '优美',
  '优香',
  '优希',
  '优月',
  '优衣',
  '优里',
  '优菜',
  '优咲',
  '结菜',
  '结香',
  '结美',
  '结奈',
  '结月',
  '结咲',
  '结里',
  '结希',
  '结衣',
  '结花',
  '莉奈',
  '莉香',
  '莉美',
  '莉希',
  '莉月',
  '莉咲',
  '莉衣',
  '莉花',
  '莉菜',
  '莉里',
  '美奈子',
  '美香子',
  '美纪子',
  '美纱子',
  '美雪子',
  '美智子',
  '美希子',
  '美佳子',
  '美和子',
  '美穗子',
  '沙耶',
  '沙罗',
  '沙织',
  '沙纪',
  '沙奈',
  '沙美',
  '沙希',
  '沙月',
  '沙咲',
  '沙衣',
  '千佳',
  '千香',
  '千纱',
  '千奈',
  '千美',
  '千希',
  '千月',
  '千咲',
  '千衣',
  '千花',
  '真理',
  '真希',
  '真奈',
  '真美',
  '真香',
  '真衣',
  '真咲',
  '真月',
  '真纪',
  '真纱',
  '爱美',
  '爱香',
  '爱奈',
  '爱希',
  '爱月',
  '爱衣',
  '爱咲',
  '爱花',
  '爱里',
  '爱莉'
]

// 西方人名用字（汉字音译）
const WESTERN_SURNAMES = [
  '史密斯',
  '约翰逊',
  '威廉姆斯',
  '布朗',
  '琼斯',
  '米勒',
  '戴维斯',
  '加西亚',
  '罗德里格斯',
  '威尔逊',
  '安德森',
  '托马斯',
  '泰勒',
  '摩尔',
  '马丁',
  '李',
  '佩雷斯',
  '汤普森',
  '怀特',
  '哈里斯',
  '桑切斯',
  '克拉克',
  '拉米雷斯',
  '刘易斯',
  '罗宾逊',
  '沃克',
  '杨',
  '艾伦',
  '金',
  '赖特',
  '斯科特',
  '托雷斯',
  '阮',
  '希尔',
  '弗洛雷斯',
  '格林',
  '亚当斯',
  '纳尔逊',
  '贝克',
  '霍尔',
  '金斯利',
  '库珀',
  '摩根',
  '贝利',
  '里德',
  '贝内特',
  '格雷',
  '詹金斯',
  '拉塞尔',
  '亨德森',
  '巴特勒',
  '西蒙斯',
  '福斯特',
  '鲍威尔',
  '华盛顿',
  '格雷厄姆',
  '沙利文',
  '凯利',
  '奥斯本',
  '福特',
  '哈德森',
  '斯通',
  '韦伯',
  '斯宾塞',
  '霍普金斯',
  '霍华德',
  '巴恩斯',
  '布鲁克斯',
  '哈里森',
  '斯图尔特',
  '斯蒂尔',
  '帕克',
  '哈维',
  '罗杰斯',
  '默里',
  '迪克森',
  '帕特森',
  '麦克唐纳',
  '霍尔姆斯',
  '斯蒂文斯',
  '布莱克',
  '伍德',
  '福克斯',
  '道森',
  '格兰特',
  '鲍德温',
  '布莱恩特',
  '斯旺',
  '布莱尔',
  '布莱恩',
  '奥康纳',
  '麦卡锡',
  '麦克莱恩',
  '麦克阿瑟',
  '麦克法兰',
  '麦克米兰',
  '麦克奈特',
  '麦克奎因',
  '麦克唐纳',
  '麦克菲',
  '麦克雷',
  '麦克斯韦',
  '麦克唐纳',
  '麦克唐纳德',
  '麦克唐纳尔',
  '麦克唐纳森',
  '麦克唐纳斯',
  '麦克唐纳逊',
  '麦克唐纳特',
  '麦克唐纳蒂'
]
const WESTERN_MALE_NAMES = [
  '詹姆斯',
  '约翰',
  '罗伯特',
  '迈克尔',
  '威廉',
  '大卫',
  '理查德',
  '约瑟夫',
  '托马斯',
  '查尔斯',
  '克里斯托弗',
  '丹尼尔',
  '保罗',
  '马克',
  '唐纳德',
  '乔治',
  '肯尼斯',
  '史蒂文',
  '爱德华',
  '布赖恩',
  '罗纳德',
  '安东尼',
  '凯文',
  '杰森',
  '马修',
  '加里',
  '蒂莫西',
  '何塞',
  '拉里',
  '杰弗里',
  '弗兰克',
  '斯科特',
  '埃里克',
  '斯蒂芬',
  '安德鲁',
  '雷蒙德',
  '本杰明',
  '杰瑞',
  '丹尼斯',
  '沃尔特',
  '亚历山大',
  '彼得',
  '帕特里克',
  '亚当',
  '塞缪尔',
  '亨利',
  '道格拉斯',
  '亚瑟',
  '杰克',
  '西蒙',
  '马丁',
  '乔纳森',
  '艾伦',
  '菲利普',
  '路易斯',
  '克雷格',
  '肖恩',
  '布鲁斯',
  '加布里埃尔',
  '伊桑',
  '奥斯卡',
  '莱昂',
  '米切尔',
  '尼古拉斯',
  '奥利弗',
  '朱利安',
  '西奥多',
  '文森特',
  '西德尼',
  '艾登',
  '卢卡斯',
  '塞巴斯蒂安',
  '哈里',
  '乔',
  '卡尔',
  '西尔维奥',
  '马尔科',
  '安德烈',
  '伊万',
  '米哈伊尔',
  '阿尔伯特',
  '弗雷德',
  '西奥',
  '雷吉纳德',
  '阿诺德',
  '马塞尔',
  '埃利奥特',
  '马里奥',
  '罗兰',
  '阿曼多',
  '奥斯汀',
  '布雷迪',
  '科林',
  '达米安',
  '埃利亚斯',
  '费尔南多',
  '格雷戈里',
  '亨特',
  '伊恩',
  '贾斯汀'
]
const WESTERN_FEMALE_NAMES = [
  '玛丽',
  '帕特丽夏',
  '詹妮弗',
  '琳达',
  '伊丽莎白',
  '芭芭拉',
  '苏珊',
  '杰西卡',
  '莎拉',
  '凯伦',
  '南希',
  '丽莎',
  '贝蒂',
  '玛格丽特',
  '桑德拉',
  '阿什莉',
  '金',
  '多萝西',
  '艾米',
  '安吉拉',
  '海伦',
  '安娜',
  '布伦达',
  '帕梅拉',
  '妮可',
  '凯西',
  '黛博拉',
  '劳拉',
  '朱迪',
  '特蕾西',
  '卡罗尔',
  '珍妮',
  '瑞秋',
  '凯瑟琳',
  '特蕾莎',
  '朱莉',
  '希瑟',
  '黛安娜',
  '乔伊斯',
  '维多利亚',
  '艾玛',
  '艾米丽',
  '夏洛特',
  '索菲亚',
  '伊莎贝拉',
  '阿比盖尔',
  '哈珀',
  '艾莉森',
  '艾娃',
  '艾莉',
  '克洛伊',
  '艾莉丝',
  '艾琳',
  '艾达',
  '艾丽卡',
  '贝拉',
  '布鲁克',
  '卡米拉',
  '卡罗琳',
  '克莱尔',
  '艾丽娜',
  '艾丽西亚',
  '艾米莉亚',
  '艾丽莎',
  '艾丽丝',
  '艾米',
  '艾娃',
  '艾米丽',
  '艾米莉亚',
  '艾丽',
  '艾丽娜',
  '艾丽莎',
  '艾丽丝',
  '艾米',
  '艾玛',
  '艾娃',
  '艾米丽',
  '艾米莉亚',
  '艾丽',
  '艾丽娜',
  '艾丽莎',
  '艾丽丝',
  '艾米'
]

// 各方势力后缀
const FORCE_SUFFIXES = [
  '帮',
  '教',
  '门',
  '宗',
  '会',
  '阁',
  '堂',
  '府',
  '庄',
  '山庄',
  '楼',
  '殿',
  '宫',
  '寨',
  '堡'
]

// 地名后缀
const PLACE_SUFFIXES = [
  '市',
  '城',
  '村',
  '镇',
  '县',
  '州',
  '郡',
  '府',
  '岛',
  '山',
  '岭',
  '川',
  '河',
  '湖',
  '湾',
  '港',
  '关',
  '原',
  '谷',
  '堡'
]

// 秘籍后缀
const BOOK_SUFFIXES = [
  '诀',
  '经',
  '录',
  '谱',
  '典',
  '书',
  '图',
  '篇',
  '卷',
  '法',
  '术',
  '集',
  '篇章'
]

// 法宝后缀
const ITEM_SUFFIXES = [
  '剑',
  '刀',
  '珠',
  '印',
  '鼎',
  '塔',
  '钟',
  '旗',
  '扇',
  '环',
  '镜',
  '杖',
  '弓',
  '甲',
  '盔',
  '靴',
  '鞭',
  '伞',
  '灯',
  '瓶'
]

// 灵药后缀
const ELIXIR_SUFFIXES = [
  '丹',
  '丸',
  '草',
  '花',
  '果',
  '液',
  '露',
  '膏',
  '芝',
  '参',
  '灵液',
  '灵露',
  '灵丹',
  '灵草'
]

// 通用前缀/核心字库
const CORE_WORDS = [
  '天',
  '地',
  '玄',
  '黄',
  '青',
  '赤',
  '紫',
  '苍',
  '云',
  '龙',
  '凤',
  '虎',
  '麟',
  '灵',
  '神',
  '鬼',
  '妖',
  '道',
  '佛',
  '魔',
  '仙',
  '圣',
  '幽',
  '冥',
  '雷',
  '风',
  '火',
  '冰',
  '雪',
  '星',
  '月',
  '日',
  '阳',
  '阴',
  '山',
  '水',
  '海',
  '川',
  '渊',
  '剑',
  '影',
  '魂',
  '血',
  '炎',
  '霜',
  '寒',
  '光',
  '暗',
  '空',
  '虚',
  '无',
  '极',
  '霸',
  '尊',
  '皇',
  '帝',
  '王',
  '宗',
  '门',
  '殿',
  '阁',
  '堂',
  '府',
  '庄',
  '楼',
  '宫',
  '寨',
  '堡',
  '金',
  '木',
  '土',
  '东',
  '南',
  '西',
  '北',
  '中',
  '春',
  '夏',
  '秋',
  '冬',
  '乾',
  '坤',
  '震',
  '巽',
  '坎',
  '离',
  '艮',
  '兑',
  '太',
  '上',
  '玉',
  '清',
  '华',
  '碧',
  '翠',
  '红',
  '白',
  '黑',
  '宇',
  '宙',
  '洪',
  '荒',
  '辰',
  '霄',
  '霞',
  '雨',
  '电',
  '露',
  '雾',
  '虹',
  '霓',
  '河',
  '江',
  '湖',
  '泉',
  '瀑',
  '林',
  '森',
  '岳',
  '峰',
  '崖',
  '谷',
  '洞',
  '墟',
  '界',
  '域',
  '古',
  '初',
  '始',
  '永',
  '恒',
  '尽',
  '万',
  '千',
  '载',
  '亿',
  '年',
  '劫',
  '世',
  '纪',
  '元',
  '时',
  '法',
  '术',
  '诀',
  '经',
  '典',
  '录',
  '妙',
  '真',
  '一',
  '相',
  '冥',
  '合',
  '心',
  '魄',
  '意',
  '志',
  '念',
  '悟',
  '觉',
  '宝',
  '珍',
  '奇',
  '异',
  '绝',
  '至',
  '品',
  '纯',
  '九',
  '转',
  '十',
  '方',
  '凰',
  '龟',
  '鹤',
  '鸾',
  '蛟',
  '如',
  '意',
  '祥',
  '瑞',
  '福',
  '禄',
  '寿',
  '喜',
  '吉',
  '庆',
  '安',
  '康',
  '宁',
  '平',
  '和',
  '泰',
  '有',
  '生',
  '灭',
  '因',
  '果',
  '缘',
  '数',
  '命',
  '运',
  '禅',
  '定',
  '慧',
  '镜',
  '幻',
  '梦',
  '犀',
  '橙',
  '绿',
  '蓝',
  '银',
  '彩',
  '音',
  '律',
  '香',
  '味',
  '触',
  '感',
  '柔',
  '刚',
  '冷',
  '热',
  '符',
  '箓',
  '咒',
  '印',
  '图',
  '腾',
  '纹',
  '阵',
  '眼',
  '窍',
  '引',
  '契',
  '约',
  '禁',
  '制',
  '封',
  '锁',
  '链',
  '笼',
  '狱',
  '墓',
  '碑'
]

export {
  BOOK_TYPES,
  CHINESE_SURNAMES,
  CHINESE_COMPOUND_SURNAMES,
  CHINESE_MALE_CHARS,
  CHINESE_FEMALE_CHARS,
  JAPANESE_SURNAMES,
  JAPANESE_MALE_CHARS,
  JAPANESE_FEMALE_CHARS,
  WESTERN_SURNAMES,
  WESTERN_MALE_NAMES,
  WESTERN_FEMALE_NAMES,
  FORCE_SUFFIXES,
  PLACE_SUFFIXES,
  BOOK_SUFFIXES,
  ITEM_SUFFIXES,
  ELIXIR_SUFFIXES,
  CORE_WORDS
}
