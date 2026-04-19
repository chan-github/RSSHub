// ... 前面日期生成的代碼保持不變 ...

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
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const html = await response.text();
            
            let episodeName = "";

            // 【精確定位】根據原始碼第 400 行，尋找 episodeTitle 之後的那個 programmeText
            // 結構是：id="episodeTitle" ... readonly ... /><input id="programmeText" ... value="彼得原理">
            const regex = /id="episodeTitle"[^>]+><input id="programmeText"[^>]+value="([^"]+)"/i;
            const match = html.match(regex);
            
            if (match && match[1]) {
                episodeName = match[1].trim();
            }

            // 如果失敗，保底方案：抓取全網頁最後一個 programmeText (通常就是集數名稱)
            if (!episodeName) {
                const allMatches = html.match(/id="programmeText"[^>]+value="([^"]+)"/ig);
                if (allMatches && allMatches.length >= 3) {
                    const lastMatch = allMatches[allMatches.length - 1];
                    const valMatch = lastMatch.match(/value="([^"]+)"/i);
                    if (valMatch) episodeName = valMatch[1].trim();
                }
            }

            const finalTitle = "講東講西：" + (episodeName || "週日版") + " (" + dObj.fmt + ")";

            return "<item>\n" +
                   "  <title><![CDATA[" + finalTitle + "]]></title>\n" +
                   "  <link>" + finalUrl.replace(/&/g, "&amp;") + "</link>\n" +
                   "  <guid isPermaLink=\"true\">" + finalUrl.replace(/&/g, "&amp;") + "</guid>\n" +
                   "  <pubDate>" + dObj.utc + "</pubDate>\n" +
                   "  <description><![CDATA[本集專題：" + episodeName + "]]></description>\n" +
                   "</item>";
        } catch (e) {
            return "<item><title>抓取失敗 (" + dObj.fmt + ")</title><link>" + finalUrl.replace(/&/g, "&amp;") + "</link><pubDate>" + dObj.utc + "</pubDate></item>";
        }
    });

// ... 後面輸出 RSS 的代碼保持不變 ...
