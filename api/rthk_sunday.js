export default async function handler(req, res) {
    const now = new Date();
    const dates = [];

    // 1. 生成日期
    for (let i = 0; i < 5; i++) {
        let d = new Date();
        let dayOffset = now.getDay(); 
        d.setDate(now.getDate() - dayOffset - (i * 7));
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push({ fmt: "" + y + m + day, utc: d.toUTCString() });
    }

    // 2. 爬取數據
    const fetchPromises = dates.map(async (dObj) => {
        const finalUrl = "https://rthk.hk" + dObj.fmt + "&mytime=1000";

        try {
            const response = await fetch(finalUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const html = await response.text();
            
            let episodeTitle = "";

            // 使用更穩健的正則匹配 id="programmeText" 的 value
            const regex = /id="programmeText"[^>]+value="([^"]+)"/i;
            const match = html.match(regex);
            
            if (match && match[1]) {
                // 這裡必須用 match[1] 取得括號內的內容
                let rawTitle = match[1];
                episodeTitle = rawTitle.replace("講東講西 - 週日版", "").replace("第一台", "").trim();
            }

            // 確保標題不為空
            const displayTitle = (episodeTitle && episodeTitle.length > 0) ? episodeTitle : "週日版";
            const finalTitle = "講東講西：" + displayTitle + " (" + dObj.fmt + ")";

            return "<item>\n" +
                   "  <title><![CDATA[" + finalTitle + "]]></title>\n" +
                   "  <link>" + finalUrl.replace(/&/g, "&amp;") + "</link>\n" +
                   "  <guid isPermaLink=\"true\">" + finalUrl.replace(/&/g, "&amp;") + "</guid>\n" +
                   "  <pubDate>" + dObj.utc + "</pubDate>\n" +
                   "  <description><![CDATA[專題：" + displayTitle + "]]></description>\n" +
                   "</item>";
        } catch (e) {
            return "<item><title>講東講西 (" + dObj.fmt + ")</title><link>" + finalUrl.replace(/&/g, "&amp;") + "</link><pubDate>" + dObj.utc + "</pubDate></item>";
        }
    });

    try {
        const feedItems = await Promise.all(fetchPromises);
        const rss = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
                    '<rss version="2.0">\n' +
                    '<channel>\n' +
                    '  <title>香港電台：講東講西 - 週日版</title>\n' +
                    '  <link>https://rthk.hk</link>\n' +
                    '  ' + feedItems.join('\n') + '\n' +
                    '</channel>\n' +
                    '</rss>';

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.status(200).send(rss);
    } catch (err) {
        res.status(500).send("Internal Server Error");
    }
}
