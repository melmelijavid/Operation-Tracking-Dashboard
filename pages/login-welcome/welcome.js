function updateTime() {
  const now = new Date();

  const time = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const date = now.toLocaleDateString([], {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  document.getElementById("time").textContent = time;
  document.getElementById("date").textContent = date;
}

// هر ثانیه آپدیت
setInterval(updateTime, 1000);
updateTime();
document.querySelectorAll(".menu p").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".menu p").forEach(i => i.classList.remove("active"));
    item.classList.add("active");
  });
});
const apiKey = "cb25e7f6307772a63a6088611feeab95";
const city = "Timisoara";

async function getWeather() {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`
    );

    const data = await res.json();

    const temp = Math.round(data.main.temp);
    const weather = data.weather[0].main;
    let icon = "";

    if (weather === "Rain") icon = "🌧";
    else if (weather === "Snow") icon = "❄️";
    else if (temp > 25) icon = "☀️";
    else if (temp > 10) icon = "🌤";
    else icon = "🧊";
    document.getElementById("temp").textContent = temp + "°C";
    document.getElementById("weather").textContent = icon + " " + weather;
    

  } catch (err) {
    console.log("Weather error:", err);
  }
}

getWeather();
document.querySelector(".chatbot").addEventListener("click", () => {
  alert("Chat support is coming soon ");
});