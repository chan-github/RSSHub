export default function handler(req, res) {
    const items = [];
    const now = new Date();
    
    // 获取最近的 5 个周日
    for (let i = 0; i < 5; i++) {
        let d = new Date();
        // 调整到最近的一个周日 (0 是周日)
        d.setDate(now.getDate() - (now.getDay() || 7) - (i * 7));
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        const formattedDate = `${year}${month}${date}`;
        
        const url = `https://rthk.hk{formattedDate}&mytime=1000`;
        const pubDate = d.toUTCString();

        items.push(`
        <item>
            <title>講東講西 - 週日版 (${formattedDate})</title>
            <link>${url}</link>
            <guid isPermaLink="true">${url}</guid>
            <pubDate>${pubDate}</pubDate>
            <description>點擊訪問 RTHK 無障礙版重溫內容。</description>
        </item>`);
    }

    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
    <title>香港電台：講東講西 - 週日版</title>
    <link>https://rthk.hk</link>
    <description>Vercel 自動生成：講東講西週日版重溫</description>
    ${items.join('')}
</channel>
</rss>`;

    res.setHeader('Content-Type', 'application/xml');
    res.status(200).send(rss);
}
