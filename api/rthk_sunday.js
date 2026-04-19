export default async function handler(req, res) {
    const dates = [];
    const now = new Date();

    // 1. 生成日期字串
    for (let i = 0; i < 5; i++) {
        let d = new Date();
        let dayOffset = now.getDay();
        d.setDate(now.getDate() - dayOffset - (i * 7));
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push({
            fmt: String(y) + String(m) + String(day),
            utc: d.toUTCString()
        });
    }

    // 2. 抓取數據
    const fetchPromises = dates.map(async (dObj) => {
        // 【核心修正】不使用任何拼接符號，改用 URLSearchParams 確保連結完整
        const base = "https://programme.rthk.hk/channel/radio/player_txt.php";
        const params = new URLSearchParams({
            mychannel: "radio1",
            mydate: dObj.fmt,
            mytime: "1000"
        });
        const finalUrl = base + "?" + params.toString();

        try {
            const response = await fetch(finalUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const html = await response.text();
            
            let episodeTitle = "";
            // 【標題提取】直接針對 <input id="programmeText" ... value="...">
            if (html.includes('id="programmeText"')) {
                const parts = html.split('id="programmeText"');
                if (parts[1].includes('value="')) {
                    const valueParts = parts[1].split('value="');
                    const contentParts = valueParts[1].split('"');
                    episodeTitle = contentParts[0].trim();
                }
            }

            // 清理標題文字
            if (episodeTitle) {
                episodeTitle = episodeTitle.replace("講東講西 - 週日版", "").replace("第一台", "").trim();
            }
            if (!episodeTitle || episodeTitle.length < 1) {
                episodeTitle = "週日版";
            }

            const finalTitle = "講東講西：" + episodeTitle + " (" + dObj.fmt + ")";

            return "<item>\n" +
                   "  <title><![CDATA[" + finalTitle + "]]></title>\n" +
                   "  <link>" + finalUrl.replace(/&/g, "&amp;") + "</link>\n" +
                   "  <guid isPermaLink=\"true\">" + finalUrl.replace(/&/g, "&amp;") + "</guid>\n" +
                   "  <pubDate>" + dObj.utc + "</pubDate>\n" +
                   "  <description><![CDATA[專題內容：" + episodeTitle + "]]></description>\n" +
                   "</item>";
        } catch (e) {
            return "<item><title>抓取失敗 (" + dObj.fmt + ")</title><link>" + finalUrl.replace(/&/g, "&amp;") + "</link><pubDate>" + dObj.utc + "</pubDate></item>";
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
