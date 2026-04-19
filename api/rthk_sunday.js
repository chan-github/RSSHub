export default function handler(req, res) {
    const items = [];
    const now = new Date();
    
    // 獲取最近 5 個週日
    for (let i = 0; i < 5; i++) {
        let d = new Date();
        // 邏輯：獲取上一個週日 (getDay為0時代表週日，需特殊處理)
        let dayOffset = now.getDay() === 0 ? 0 : now.getDay();
        d.setDate(now.getDate() - dayOffset - (i * 7));
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        const formattedDate = `${year}${month}${date}`;
        
        // 使用更安全的連結組合方式，並確保 &amp; 轉義正確
        const baseUrl = "https://rthk.hk";
        const finalUrl = baseUrl + "?mychannel=radio1&amp;mydate=" + formattedDate + "&amp;mytime=1000";
        
        const pubDate = d.toUTCString();

        items.push(
            "<item>\n" +
            "    <title>講東講西 - 週日版 (" + formattedDate + ")</title>\n" +
            "    <link>" + finalUrl + "</link>\n" +
            "    <guid isPermaLink=\"true\">" + finalUrl + "</guid>\n" +
            "    <pubDate>" + pubDate + "</pubDate>\n" +
            "    <description>點擊訪問 RTHK 無障礙版重溫內容 (" + formattedDate + ")</description>\n" +
            "</item>"
        );
    }

    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
    <title>香港電台：講東講西 - 週日版</title>
    <link>https://rthk.hk</link>
    <description>Vercel 自動生成：講東講西週日版重溫</description>
    ${items.join('\n')}
</channel>
</rss>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(rss);
}
