export default async function handler(req, res) {
    const dates = [];
    const now = new Date();

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

    const fetchPromises = dates.map(async (dObj) => {
        const base = "https://programme.rthk.hk/channel/radio/player_txt.php";
        const params = new URLSearchParams({
            mychannel: "radio1",
            mydate: dObj.fmt,
            mytime: "1000"
        });
        const finalUrl = base + "?" + params.toString();

        try {
            const response = await fetch(finalUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            const html = await response.text();
            
            let episodeTitle = "";

            // 【終極正則】直接找含有 programmeText 的 input 標籤並抓取其 value 屬性
            // 無論 value 在 id 前面還是後面都能抓到
            const regex = /<input[^>]*id="programmeText"[^>]*value="([^"]+)"/i;
            const match = html.match(regex);
            
            if (match && match[1]) {
                episodeTitle = match[1]
                    .replace("講東講西 - 週日版", "")
                    .replace("第一台", "")
                    .replace("講東講西", "")
                    .replace(":", "")
                    .replace("：", "")
                    .trim();
            }

            const displayTitle = (episodeTitle && episodeTitle.length > 0) ? episodeTitle : "週日版";
            const finalTitle = "講東講西：" + displayTitle + " (" + dObj.fmt + ")";

            return "<item>\n" +
                   "  <title><![CDATA[" + finalTitle + "]]></title>\n" +
                   "  <link>" + finalUrl.replace(/&/g, "&amp;") + "</link>\n" +
                   "  <guid isPermaLink=\"true\">" + finalUrl.replace(/&/g, "&amp;") + "</guid>\n" +
                   "  <pubDate>" + dObj.utc + "</pubDate>\n" +
                   "  <description><![CDATA[專題主題：" + displayTitle + "]]></description>\n" +
                   "</item>";
        } catch (e) {
            return "<item><title>暫時無法獲取 (" + dObj.fmt + ")</title><link>" + finalUrl.replace(/&/g, "&amp;") + "</link><pubDate>" + dObj.utc + "</pubDate></item>";
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
