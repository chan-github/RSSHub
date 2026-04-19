export default async function handler(req, res) {
    const now = new Date();
    const dates = [];

    // 1. 生成最近 5 个周日的日期
    for (let i = 0; i < 5; i++) {
        let d = new Date();
        let dayOffset = now.getDay(); 
        d.setDate(now.getDate() - dayOffset - (i * 7));
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push({ fmt: "" + y + m + day, utc: d.toUTCString() });
    }

    // 2. 爬取并解析
    const fetchPromises = dates.map(async (dObj) => {
        const finalUrl = "https://programme.rthk.hk/channel/radio/player_txt.php?mychannel=radio1&mydate=" + dObj.fmt + "&mytime=1000";

        try {
            const response = await fetch(finalUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const html = await response.text();
            
            let episodeTitle = "";

            // 核心修正：针对截图中的 <input id="programmeText" ... value="彼得原理">
            // 使用正则匹配获取 value 的内容
            const regex = /id="programmeText"\s+type="text"\s+value="([^"]+)"/;
            const match = html.match(regex);
            
            if (match && match[1]) {
                episodeTitle = match[1].trim();
            }

            // 如果 input 没抓到，尝试从网页标题保底
            if (!episodeTitle) {
                const titleTag = html.match(/<title>([\s\S]*?)<\/title>/i);
                if (titleTag) episodeTitle = titleTag[1].split('|')[0].trim();
            }

            const finalTitle = "講東講西：" + (episodeTitle || "週日版") + " (" + dObj.fmt + ")";

            return "<item>\n" +
                   "  <title><![CDATA[" + finalTitle + "]]></title>\n" +
                   "  <link>" + finalUrl.replace(/&/g, "&amp;") + "</link>\n" +
                   "  <guid isPermaLink=\"true\">" + finalUrl.replace(/&/g, "&amp;") + "</guid>\n" +
                   "  <pubDate>" + dObj.utc + "</pubDate>\n" +
                   "  <description><![CDATA[講東講西專題：" + episodeTitle + "]]></description>\n" +
                   "</item>";
        } catch (e) {
            return "<item><title>講東講西 (" + dObj.fmt + ")</title><link>" + finalUrl.replace(/&/g, "&amp;") + "</link><pubDate>" + dObj.utc + "</pubDate></item>";
        }
    });

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
}
