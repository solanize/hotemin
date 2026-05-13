import os
import requests
import json
import time

API_KEY = "xq_42f6f0d4661dcc86fdc8e76102432112870e6d17079faf46b6f2b461c1c4cd4c"
BASE_URL = "https://xquik.com/api/v1/x/tweets/search"

headers = {
    "x-api-key": API_KEY,
    "accept": "application/json"
}

def download_images():
    output_dir = "images"
    os.makedirs(output_dir, exist_ok=True)
    
    # We will collect image metadata
    images_data = []
    
    query = "$HOTEMIN"
    url = f"{BASE_URL}?q={requests.utils.quote(query)}&queryType=Latest"
    
    print(f"Fetching tweets for {query}...")
    
    # Try fetching a few pages
    cursor = None
    max_pages = 5
    page = 0
    downloaded_urls = set()
    
    while page < max_pages:
        page_url = url
        if cursor:
            page_url += f"&cursor={requests.utils.quote(cursor)}"
            
        print(f"Page {page+1}...")
        try:
            res = requests.get(page_url, headers=headers)
            res.raise_for_status()
            data = res.json()
        except Exception as e:
            print(f"Error fetching data: {e}")
            break
            
        tweets = data.get("tweets", [])
        for tweet in tweets:
            medias = tweet.get("media", [])
            for media in medias:
                if media.get("type") == "photo":
                    img_url = media.get("media_url_https")
                    if img_url and img_url not in downloaded_urls:
                        downloaded_urls.add(img_url)
                        # download the image
                        try:
                            filename = img_url.split("/")[-1]
                            filepath = os.path.join(output_dir, filename)
                            
                            print(f"Downloading {filename}...")
                            img_res = requests.get(img_url, timeout=10)
                            if img_res.status_code == 200:
                                with open(filepath, "wb") as f:
                                    f.write(img_res.content)
                                
                                images_data.append({
                                    "id": str(len(images_data) + 1),
                                    "filename": filename,
                                    "author": tweet.get("author", {}).get("username", "unknown"),
                                    "tweet_text": tweet.get("text", "")[:100]
                                })
                        except Exception as e:
                            print(f"Failed to download {img_url}: {e}")
        
        cursor = data.get("next_cursor")
        if not cursor or not data.get("has_next_page"):
            break
            
        page += 1
        time.sleep(1) # rate limit prevention

    # write JSON mapping
    with open("images.json", "w", encoding="utf-8") as f:
        json.dump(images_data, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully downloaded {len(images_data)} images.")

if __name__ == "__main__":
    download_images()
