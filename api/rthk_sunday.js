    // 2. 爬取並解析
    const fetchPromises = dates.map(async (dObj) => {
        const finalUrl = "https://programme.rthk.hk/channel/radio/player_txt.php?mychannel=radio1&mydate=" + dObj.fmt + "&mytime=1000";

        try {
            const response = await fetch(finalUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            });
            const html = await response.text();
            
            let episodeTitle = "";

            // 核心修正：精確匹配 id="programmeText" 的那個 input
            // 使用更嚴謹的正則，確保只抓取這個 ID 對應的 value
            const regex = /id="programmeText"[^>]+value="([^"]+)"/i;
            const match = html.match(regex);
            
            if (match && match[1]) {
                episodeTitle = match[1].trim();
                // 過濾掉無意義的重複前綴（如果 RTHK 頁面回傳了冗餘資訊）
                episodeTitle = episodeTitle.replace("講東講西 - 週日版", "").replace("第一台", "").trim();
            }

            // 如果還是抓不到具體名稱，則使用日期保底
            const displayTitle = (episodeTitle && episodeTitle.length > 1) ? episodeTitle : "週日版";
            const finalTitle = "講東講西：" + displayTitle + " (" + dObj.fmt + ")";

            return "<item>\n" +
                   "  <title><![CDATA[" + finalTitle + "]]></title>\n" +
                   "  <link>" + finalUrl.replace(/&/g, "&amp;") + "</link>\n" +
                   "  <guid isPermaLink=\"true\">" + finalUrl.replace(/&/g, "&amp;") + "</guid>\n" +
                   "  <pubDate>" + dObj.utc + "</pubDate>\n" +
                   "  <description><![CDATA[講東講西專題：" + (episodeTitle || "重溫") + " (" + dObj.fmt + ")]]></description>\n" +
                   "</item>";
        } catch (e) {
            return "<item><title>講東講西 (" + dObj.fmt + ")</title><link>" + finalUrl.replace(/&/g, "&amp;") + "</link><pubDate>" + dObj.utc + "</pubDate></item>";
        }
    });
