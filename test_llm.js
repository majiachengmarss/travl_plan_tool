async function runTest() {
    const apiKey = 'sk-spbbzhps70wjx4ds4m9k1cbtpoajs1cs703n4cgjvc4vtwqc';
    const model = 'mimo-v2-pro';
    const endpoint = 'https://api.xiaomimimo.com/v1/chat/completions';

    const SYSTEM_PROMPT = `你是一个资深的旅行规划算法。你的任务是根据用户提供的目的地、游玩天数、主题偏好，以及用户已经确定好的酒店和固定事件（硬性约束），规划出一份完整且合理的逐日行程。
所有的地点（如酒店、景点、餐厅）必须是现实中真实存在的，且名称必须是高德地图上可以搜索到的标准地名，不要带多余的描述修饰。

【必须严格遵守的约束】：
1. 如果用户提供了某天的酒店，那么这一天的第一个行程（08:30或09:00）必须是从该酒店出发。
2. 如果用户提供了某天的酒店，那么这一天的最后一个行程（例如20:00）必须是返回该酒店。
3. 如果用户提供了“强制事件”（如看演唱会、赶高铁），这个事件必须出现在指定那一天的 timeline 中，并且时间必须一致。
4. 在填充其余空白时间时，务必考虑地理位置的顺路性，不要让用户在城市两端来回奔波。午餐和晚餐时间请合理安排顺路的特色餐饮区域。

【输出格式要求】：
你必须且只能返回合法的 JSON 字符串。不要带有任何 \`\`\`json 的 Markdown 标记，直接输出 JSON 对象本身。
你的 JSON 结构必须严格符合以下 TypeScript 接口的定义：

{
  "meta": {
    "title": "XX城市X日游",
    "subtitle": "X日游 · XX主题",
    "city": "城市名",
    "cityCode": "不需要填"
  },
  "locations": {}, // 留空对象，前端会通过高德API自动补齐
  "spots": { // 【极其重要】：请只为你安排的核心“旅游景点”生成游玩攻略。对于“酒店”、“餐厅”、“车站”、“交通枢纽”等非旅游地点，绝对不要放在这里，留空即可！
    "景点名称": {
      "tips": "不少于50字的详细避坑指南与游玩注意事项",
      "ticket": "门票价格、免票政策及详细预约方式",
      "hours": "具体的开放时间及停止入场时间",
      "highlights": "不少于50字的必看亮点介绍",
      "routeTitle": "推荐游览路线名称（如：故宫中轴线精华游）",
      "route": [ // 游览路线的详细步骤，按顺序给出
        { "name": "步骤1（如：午门）", "desc": "在这里看什么、怎么走等步骤详细说明" },
        { "name": "步骤2（如：太和殿）", "desc": "详细说明" }
      ]
    }
  },
  "days": [
    {
      "id": "day0", // 第一天是 day0, 第二天是 day1...
      "dateStr": "Day 1",
      "shortTitle": "Day 1",
      "tips": "这一天的一句话总结提示",
      "tipsBox": "这一天详细的防坑指南和游玩建议",
      "mapCenter": [0, 0], // 留空，随便填个数字
      "mapZoom": 13,
      "tickets": [ // 这一天需要门票的景点，免费也可以写上
        { "name": "景点A", "price": "门票价格" }
      ],
      "timeline": [
        {
          "id": "day0-item-0",
          "time": "09:00",
          "event": "必须是纯粹的地名，例如：亚朵酒店春熙路店",
          "spot": "" // 【重要】如果是酒店、餐厅、车站，spot字段必须设为空字符串！千万不要填！
        },
        {
          "id": "day0-item-1",
          "time": "09:30",
          "event": "武侯祠",
          "spot": "武侯祠" // 只有真正的核心旅游景点才填入 spot 字段，且必须在上面的 spots 对象中有详细攻略对应！
        }
      ]
    }
  ] // days数组长度必须严格等于用户要求的游玩天数
}`;

    let userPrompt = `【目的地】: 高平\n【游玩天数】: 2天\n【主题偏好】: 深度人文探索\n\n请开始规划，并直接输出 JSON。`;

    console.log("Calling Xiaomi API...");
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 4096
        })
    });

    if (!response.ok) {
        console.error("API Error", await response.text());
        return;
    }

    const data = await response.json();
    let contentStr = data.choices[0].message.content;
    
    // Save raw string to inspect
    require('fs').writeFileSync('raw_output.txt', contentStr);
    console.log("Raw output saved to raw_output.txt");

    const startIdx = contentStr.indexOf('{');
    const endIdx = contentStr.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1) {
        contentStr = contentStr.substring(startIdx, endIdx + 1);
    } else {
        contentStr = contentStr.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    try {
        JSON.parse(contentStr);
        console.log("✅ JSON Parse SUCCESS!");
    } catch (e) {
        console.log("❌ JSON Parse FAILED!", e.message);
        console.log("Position:", e.message.match(/position (\d+)/)?.[1]);
    }
}

runTest();