/*
const locations = JSON.parse(document.getElementById('map').dataset.locations);
console.log(locations);
*/

export const displayMap = (locations) => {
  mapboxgl.accessToken = 
    'pk.eyJ1IjoianQxMjMiLCJhIjoiY2tvb3h6bG1uMDMyNDJvbGtjZDJxOWFpbyJ9.RWVt9AU2WsTanf3r447OTg';

  var map = new mapboxgl.Map({
      container: 'map', //對應到 id 為 map  的 div
      style: 'mapbox://styles/jt123/ckooy7v9w37fa17tmkry63eau',
      scrollZoom: false,
      //center: [147.324997, -42.880554], //這邊跟正規的經緯度是顛倒的
      //zoom: 12,
      //interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  //locations 是一陣列, 存有從 tour 下的 locations 撈出來的資料, 現在對其進行遶行取每個 lng & lat 
  locations.forEach(loc => {
      //create markers
      const el = document.createElement('div');
      el.className = 'marker';//自己寫在 css 內的 classname 這裡是套用

      //add markers
      new mapboxgl.Marker({
          element: el,
          anchor: 'bottom' //marker 放在經緯度的最下方
        })
        .setLngLat(loc.coordinates) //coordinates 就是存 lng & lat 的陣列
        .addTo(map);

      // Add popup 文字訊息
      new mapboxgl.Popup({
          offset: 30 //不讓訊息框跟 marker 擠再一起, 單位是 px
        })
        .setLngLat(loc.coordinates) //要添加訊息之地點
        .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`) //真正訊息
        .addTo(map);
      
      //extend map bounds, bounds 意思就是依據所有上面遶行完的coordinates, 去計算出地圖之中心(顯示所有 marker)
      bounds.extend(loc.coordinates);
  });

  //客製化這些 markers 讓每個之間都會有些間距
  map.fitBounds(bounds, {
      padding: {
        top: 200,
        bottom: 150,
        left: 100,
        right: 100
      }
  });

}

