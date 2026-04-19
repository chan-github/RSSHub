export default async function handler(req, res) {
    const now = new Date();
    const items = [];

    // 獲取最近 5 個週日
    const dates = [];
    for (let i = 0; i < 5; i++) {
        let d = new Date();
        let dayOffset = now.getDay() === 0 ? 0 : now.getDay();
        d.setDate(now.getDate() - dayOffset - (i * 7));
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        dates.push({
            formatted: `${year}${month}${date}`,
            utc: d.toUTCString()
        });
    }

    // 建立非同步抓取任務
    const fetchPromises = dates.map(async (dObj) => {
        const finalUrl = `https://rthk.hk{dObj.formatted}&mytime=1000`;
        
        try {
            const response = await fetch(finalUrl);
            const html = await response.text();
            
            // 更加寬鬆的正則表達式：尋找 prog_title 內的內容並去除 HTML 標籤
            let episodeName = "";
            const match = html.match(/<div class="prog_title">([\s\S]*?)<\/div>/i);
            
            if (match && match[1]) {
                // 去除內容中的所有 HTML 標籤（如 <a>, <span> 等）並過濾空白
                episodeName = match[1].replace(/<[^>]*>?/gm, '').trim();
            }

            // 如果抓取到的標題太短或為空，則使用日期保底
            if (!episodeName || episodeName.length < 2) {
                episodeName = `講東講西 (${dObj.formatted})`;
            } else {
                episodeName = `講東講西：${episodeName} (${dObj.formatted})`;
            }

            return `
            <item>
                <title><![CDATA[${episodeName}]]></title>
                <link>${finalUrl.replace(/&/g, '&amp;')}</link>
                <guid isPermaLink="true">${finalUrl.replace(/&/g, '&amp;')}</guid>
                <pubDate>${dObj.utc}</pubDate>
                <description><![CDATA[點擊訪問 RTHK 無障礙版重溫內容 (${dObj.formatted})]]></description>
            </item>`;
        } catch (error) {
            return `
            <item>
                <title>講東講西 - 週日版 (${dObj.formatted})</title>
                <link>${finalUrl.replace(/&/g, '&amp;')}</link>
                <guid isPermaLink="true">${finalUrl.replace(/&/g, '&amp;')}</guid>
                <pubDate>${dObj.utc}</pubDate>
                <description>網路抓取失敗</description>
            </item>`;
        }
    });

    const feedItems = await Promise.all(fetchPromises);

    const rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
    <title>香港電台：講東講西 - 週日版</title>
    <link>https://rthk.hk</link>
    <description>Vercel 自動生成：講東講西週日版重溫</description>
    ${feedItems.join('\n')}
</channel>
</rss>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(rss);
}
