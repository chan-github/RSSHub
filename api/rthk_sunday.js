export default async function handler(req, res) {
    const now = new Date();
    const dates = [];

    for (let i = 0; i < 5; i++) {
        let d = new Date();
        let dayOffset = now.getDay() === 0 ? 0 : now.getDay();
        d.setDate(now.getDate() - dayOffset - (i * 7));
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        dates.push({
            formatted: year + month + date,
            utc: d.toUTCString()
        });
    }

    const fetchPromises = dates.map(async (dObj) => {
        // 使用 + 號拼接 URL，確保 100% 兼容
        const finalUrl = "https://rthk.hk" + dObj.formatted + "&mytime=1000";
        
        try {
            const response = await fetch(finalUrl);
            const html = await response.text();
            
            let episodeName = "";
            // 改用更簡單的分割方式提取標題，不依賴複雜正則
            if (html.indexOf('class="prog_title"') !== -1) {
                const part = html.split('class="prog_title"')[1];
                const content = part.split('</div>')[0];
                episodeName = content.replace(/<[^>]*>?/gm, '').replace('>', '').trim();
            }

            if (!episodeName || episodeName.length < 2) {
                episodeName = "講東講西 (" + dObj.formatted + ")";
            } else {
                episodeName = "講東講西：" + episodeName + " (" + dObj.formatted + ")";
            }

            return "<item>\n" +
                   "  <title><![CDATA[" + episodeName + "]]></title>\n" +
                   "  <link>" + finalUrl.replace(/&/g, '&amp;') + "</link>\n" +
                   "  <guid isPermaLink=\"true\">" + finalUrl.replace(/&/g, '&amp;') + "</guid>\n" +
                   "  <pubDate>" + dObj.utc + "</pubDate>\n" +
                   "  <description><![CDATA[點擊訪問 RTHK 無障礙版重溫內容 (" + dObj.formatted + ")]]></description>\n" +
                   "</item>";
        } catch (error) {
            return "<item><title>抓取失敗 " + dObj.formatted + "</title><link>" + finalUrl.replace(/&/g, '&amp;') + "</link><pubDate>" + dObj.utc + "</pubDate></item>";
        }
    });

    const feedItems = await Promise.all(fetchPromises);

    const rss = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
                '<rss version="2.0">\n' +
                '<channel>\n' +
                '  <title>香港電台：講東講西 - 週日版</title>\n' +
                '  <link>https://rthk.hk</link>\n' +
                '  <description>Vercel 自動生成：講東講西週日版重溫</description>\n' +
                '  ' + feedItems.join('\n') + '\n' +
                '</channel>\n' +
                '</rss>';

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(rss);
}
