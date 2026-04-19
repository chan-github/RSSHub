export default async function handler(req, res) {
    const items = [];
    const now = new Date();

    // 1. 準備最近 5 個週日的日期
    const dates = [];
    for (let i = 0; i < 5; i++) {
        let d = new Date();
        // 確保獲取週日邏輯正確
        let dayOffset = now.getDay(); 
        d.setDate(now.getDate() - dayOffset - (i * 7));
        
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        dates.push({
            fmt: "" + y + m + day,
            utc: d.toUTCString()
        });
    }

    // 2. 遍歷並抓取每一集的標題
    const fetchPromises = dates.map(async (dObj) => {
        // 使用你確認 OK 的 baseUrl 進行拼接，注意這裡完全不用模板字符串
        const baseUrl = "https://programme.rthk.hk/channel/radio/player_txt.php";
        const finalUrl = baseUrl + "?mychannel=radio1&mydate=" + dObj.fmt + "&mytime=1000";

        try {
            const response = await fetch(finalUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const html = await response.text();
            
            let episodeTitle = "";
            // 使用最原始的字符串切割法獲取標題
            const marker = 'class="prog_title">';
            if (html.includes(marker)) {
                const parts = html.split(marker);
                const secondPart = parts[1].split('</div>');
                // 去除 HTML 標籤並清理多餘空格
                episodeTitle = secondPart[0].replace(/<[^>]*>?/gm, '').trim();
            }

            if (!episodeTitle || episodeTitle.length < 2) {
                episodeTitle = "講東講西 (" + dObj.fmt + ")";
            } else {
                episodeTitle = "講東講西：" + episodeTitle;
            }

            return "<item>\n" +
                   "  <title><![CDATA[" + episodeTitle + "]]></title>\n" +
                   "  <link>" + finalUrl.replace(/&/g, "&amp;") + "</link>\n" +
                   "  <guid isPermaLink=\"true\">" + finalUrl.replace(/&/g, "&amp;") + "</guid>\n" +
                   "  <pubDate>" + dObj.utc + "</pubDate>\n" +
                   "  <description><![CDATA[日期：" + dObj.fmt + " | 點擊訪問重溫內容]]></description>\n" +
                   "</item>";
        } catch (e) {
            return "<item><title>暫時無法獲取標題 (" + dObj.fmt + ")</title><link>" + finalUrl.replace(/&/g, "&amp;") + "</link><pubDate>" + dObj.utc + "</pubDate></item>";
        }
    });

    const feedItems = await Promise.all(fetchPromises);

    const rss = '<?xml version="1.0" encoding="UTF-8" ?>\n' +
                '<rss version="2.0">\n' +
                '<channel>\n' +
                '  <title>香港電台：講東講西 - 週日版</title>\n' +
                '  <link>https://rthk.hk</link>\n' +
                '  <description>講東講西週日版重溫 (自動生成)</description>\n' +
                '  ' + feedItems.join('\n') + '\n' +
                '</channel>\n' +
                '</rss>';

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(rss);
}
