// Your backend base URL on Render
// const BACKEND_BASE = 'https://project1-backend-o71f.onrender.com';
// NEW:
const BACKEND_BASE = 'https://project1-worker.littlesheepdesign.workers.dev';

const ELEMENT_TYPES = {
  1: "GK",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

const CLUB_COLORS = {
  // Example subset – you can expand from FPL "teams" data
  Arsenal: "#EF4444",
  "Man City": "#6CABDD",
  Liverpool: "#F97316",
  "Man Utd": "#F97316",
  Chelsea: "#60A5FA",
  Newcastle: "#E5E7EB",
  Burnley: "#99D6EA",
  "Nott'm Forest": "#F97316",
  "Aston Villa": "#95bfe5",
  Bournemouth: "#DA291C",
  Brentford: "#D20000",
  Brighton: "#0057B8",
  "Crystal Palace": "#1B458F",
  Everton: "#003399",
  Fulham: "#E5E7EB",
  Leeds: "#FFFFFF",
  Sunderland: "#F97316" ,
  Spurs: "#E5E7EB",
  Wolves: "#FDB913",
  "West Ham": "#7A263A"
};

const gwTextEl = document.getElementById("gwText");
const playersListEl = document.getElementById("playersList");
const statusMessageEl = document.getElementById("statusMessage");
const updatedTimeEl = document.getElementById("updatedTime");
const refreshBtn = document.getElementById("refreshBtn");

const gwxgTextEl = document.getElementById("gwxgText");
const xgPlayersListEl = document.getElementById("xgPlayersList");
const xgStatusMessageEl = document.getElementById("xgStatusMessage");
const xgUpdatedTimeEl = document.getElementById("xgUpdatedTime");
const refreshXgBtn = document.getElementById("refreshXgBtn");


const gwxaTextEl = document.getElementById("gwxaText");
const xaPlayersListEl = document.getElementById("xaPlayersList");
const xaStatusMessageEl = document.getElementById("xaStatusMessage");
const xaUpdatedTimeEl = document.getElementById("xaUpdatedTime");
const refreshXaBtn = document.getElementById("refreshXaBtn");

const gwxgiTextEl = document.getElementById("gwxgiText");
const xgiPlayersListEl = document.getElementById("xgiPlayersList");
const xgiStatusMessageEl = document.getElementById("xgiStatusMessage");
const xgiUpdatedTimeEl = document.getElementById("xgiUpdatedTime");
const refreshXgiBtn = document.getElementById("refreshXgiBtn");

let currentGW = null;
let gwExpanded = false;

// We keep the last loaded Top 10 so xG tab can reuse it without re-fetching
let lastTop10 = null;

function formatTime(d) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function setStatus(message, isError = false) {
  statusMessageEl.textContent = message || "";
  statusMessageEl.style.color = isError ? "#ff5252" : "#a0a5c0";
}

function showLoading() {
  playersListEl.innerHTML = `
    <div class="empty-state">
      <span class="loading">
        <span class="spinner"></span>
        Fetching FPL data…
      </span>
    </div>
  `;
}

function showEmpty(message) {
  playersListEl.innerHTML = `
    <div class="empty-state">
      <strong>Nothing to show.</strong><br />
      ${message || "Try again in a few moments."}
    </div>
  `;
}

function buildPlayerPhotoUrl(code) {
  // Official FPL photos live here:
  // https://resources.premierleague.com/premierleague/photos/players/110x140/p{code}.png
  // where code is "photo" field without the extension.
  if (!code) return null;
  const baseCode = code.replace(".jpg", "").replace(".png", "");
  return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${baseCode}.png`;
}

/**
 * Render Top 10 list into the main GW Points tab
 */
function renderTop10ToMain(top10, teamMap) {
  playersListEl.innerHTML = "";
  top10.forEach((player, index) => {
    const teamName = teamMap.get(player.teamId) || "Unknown";
    const position = ELEMENT_TYPES[player.positionId] || "-";
    const fullName =
      (player.firstName ? player.firstName + " " : "") +
      (player.secondName || player.webName);
    const photoUrl = buildPlayerPhotoUrl(player.photo);

    const row = document.createElement("div");
    row.className = "player-row";

    // rank
    const rankDiv = document.createElement("div");
    rankDiv.className =
      "rank-badge " +
      (index === 0 ? "rank-1" : index <= 2 ? "rank-1-lite" : "");
    rankDiv.textContent = index + 1;

    const photoWrap = document.createElement("div");
    photoWrap.className = "player-photo-wrap";
    const photoDiv = document.createElement("div");
    photoDiv.className = "player-photo";

    if (photoUrl) {
      const img = document.createElement("img");
      img.src = photoUrl;
      img.alt = fullName;
      img.loading = "lazy";

      const fallbackDiv = document.createElement("div");
      fallbackDiv.className = "player-photo-fallback";
      fallbackDiv.style.display = "none";
      fallbackDiv.textContent = fullName
        .split(" ")
        .map((s) => s[0])
        .join("")
        .slice(0, 3)
        .toUpperCase();

      img.onerror = () => {
        img.style.display = "none";
        fallbackDiv.style.display = "flex";
      };

      photoDiv.appendChild(img);
      photoDiv.appendChild(fallbackDiv);
    }

    photoWrap.appendChild(photoDiv);

    // player main
    const mainDiv = document.createElement("div");
    mainDiv.className = "player-main";

    const nameDiv = document.createElement("div");
    nameDiv.className = "player-name";
    nameDiv.textContent = fullName;

    const metaDiv = document.createElement("div");
    metaDiv.className = "player-meta";

    const clubTag = document.createElement("span");
    clubTag.className = "tag club-name";
    clubTag.textContent = teamName;
    if (CLUB_COLORS[teamName]) {
      clubTag.style.borderColor = CLUB_COLORS[teamName];
      clubTag.style.color = CLUB_COLORS[teamName];
    }

    const posTag = document.createElement("span");
    posTag.className = "tag position";
    posTag.textContent = position;

    const smallPts = document.createElement("span");
    smallPts.textContent = `${player.gwPoints} pts`;
    smallPts.style.opacity = "0.8";

    metaDiv.appendChild(clubTag);
    metaDiv.appendChild(posTag);
    metaDiv.appendChild(smallPts);

    mainDiv.appendChild(nameDiv);
    mainDiv.appendChild(metaDiv);

    const clubCell = document.createElement("div");
    clubCell.className = "stat";
    clubCell.textContent = teamName;

    const posCell = document.createElement("div");
    posCell.className = "stat header-cell-right";
    posCell.textContent = position;

    const pointsCell = document.createElement("div");
    pointsCell.className = "points";

    const pointsBadge = document.createElement("div");
    pointsBadge.className = "points-badge";
    const dotSpan = document.createElement("span");
    dotSpan.className = "points-dot";
    const ptsLabel = document.createElement("span");
    ptsLabel.textContent = `${player.gwPoints} pts`;
    pointsBadge.appendChild(dotSpan);
    pointsBadge.appendChild(ptsLabel);
    pointsCell.appendChild(pointsBadge);

    row.appendChild(rankDiv);
    row.appendChild(photoWrap);
    row.appendChild(mainDiv);
    row.appendChild(clubCell);
    row.appendChild(posCell);
    row.appendChild(pointsCell);

    playersListEl.appendChild(row);
  });
}


function renderTop10ToXg(top10, teamMap) {
  if (!xgPlayersListEl) return; // if the xG tab isn't in the HTML, do nothing

  // Clear any empty state
  xgPlayersListEl.innerHTML = "";

  top10.forEach((player, index) => {
    const teamName = teamMap.get(player.teamId) || "Unknown";
    const position = ELEMENT_TYPES[player.positionId] || "-";
    const fullName =
      (player.firstName ? player.firstName + " " : "") +
      (player.secondName || player.webName);
    const photoUrl = buildPlayerPhotoUrl(player.photo);

    const row = document.createElement("div");
    row.className = "player-row";

    // rank
    const rankDiv = document.createElement("div");
    rankDiv.className =
      "rank-badge " +
      (index === 0 ? "rank-1" : index <= 2 ? "rank-1-lite" : "");
    rankDiv.textContent = index + 1;

    const photoWrap = document.createElement("div");
    photoWrap.className = "player-photo-wrap";
    const photoDiv = document.createElement("div");
    photoDiv.className = "player-photo";

    if (photoUrl) {
      const img = document.createElement("img");
      img.src = photoUrl;
      img.alt = fullName;
      img.loading = "lazy";

      const fallbackDiv = document.createElement("div");
      fallbackDiv.className = "player-photo-fallback";
      fallbackDiv.style.display = "none";
      fallbackDiv.textContent = fullName
        .split(" ")
        .map((s) => s[0])
        .join("")
        .slice(0, 3)
        .toUpperCase();

      img.onerror = () => {
        img.style.display = "none";
        fallbackDiv.style.display = "flex";
      };

      photoDiv.appendChild(img);
      photoDiv.appendChild(fallbackDiv);
    }

    photoWrap.appendChild(photoDiv);

    // player main
    const mainDiv = document.createElement("div");
    mainDiv.className = "player-main";

    const nameDiv = document.createElement("div");
    nameDiv.className = "player-name";
    nameDiv.textContent = fullName;

    const metaDiv = document.createElement("div");
    metaDiv.className = "player-meta";

    const clubTag = document.createElement("span");
    clubTag.className = "tag club-name";
    clubTag.textContent = teamName;
    if (CLUB_COLORS[teamName]) {
      clubTag.style.borderColor = CLUB_COLORS[teamName];
      clubTag.style.color = CLUB_COLORS[teamName];
    }

    const posTag = document.createElement("span");
    posTag.className = "tag position";
    posTag.textContent = position;

    // For now we show GW points here as well, but this is where xG would go
    const smallXg = document.createElement("span");
    smallXg.textContent = `${player.gwPoints} xG`;
    smallXg.style.opacity = "0.8";

    metaDiv.appendChild(clubTag);
    metaDiv.appendChild(posTag);
    metaDiv.appendChild(smallXg);

    mainDiv.appendChild(nameDiv);
    mainDiv.appendChild(metaDiv);

    const clubCell = document.createElement("div");
    clubCell.className = "stat";
    clubCell.textContent = teamName;

    const posCell = document.createElement("div");
    posCell.className = "stat header-cell-right";
    posCell.textContent = position;

    const xgCell = document.createElement("div");
    xgCell.className = "points";

    const xgBadge = document.createElement("div");
    xgBadge.className = "points-badge";
    const dotSpan = document.createElement("span");
    dotSpan.className = "points-dot";
    const xgLabel = document.createElement("span");
    xgLabel.textContent = `${player.gwPoints} xG`; // same number, different label for now
    xgBadge.appendChild(dotSpan);
    xgBadge.appendChild(xgLabel);
    xgCell.appendChild(xgBadge);

    row.appendChild(rankDiv);
    row.appendChild(photoWrap);
    row.appendChild(mainDiv);
    row.appendChild(clubCell);
    row.appendChild(posCell);
    row.appendChild(xgCell);

    xgPlayersListEl.appendChild(row);
  });

  if (xgUpdatedTimeEl) {
    xgUpdatedTimeEl.textContent = formatTime(new Date());
  }
  if (xgStatusMessageEl) {
    xgStatusMessageEl.textContent = ""; // clear any previous message
  }
}


function renderTop10ToXa(top10, teamMap) {
  if (!xaPlayersListEl) return; // if the xG tab isn't in the HTML, do nothing

  // Clear any empty state
  xaPlayersListEl.innerHTML = "";

  top10.forEach((player, index) => {
    const teamName = teamMap.get(player.teamId) || "Unknown";
    const position = ELEMENT_TYPES[player.positionId] || "-";
    const fullName =
      (player.firstName ? player.firstName + " " : "") +
      (player.secondName || player.webName);
    const photoUrl = buildPlayerPhotoUrl(player.photo);

    const row = document.createElement("div");
    row.className = "player-row";

    // rank
    const rankDiv = document.createElement("div");
    rankDiv.className =
      "rank-badge " +
      (index === 0 ? "rank-1" : index <= 2 ? "rank-1-lite" : "");
    rankDiv.textContent = index + 1;

    const photoWrap = document.createElement("div");
    photoWrap.className = "player-photo-wrap";
    const photoDiv = document.createElement("div");
    photoDiv.className = "player-photo";

    if (photoUrl) {
      const img = document.createElement("img");
      img.src = photoUrl;
      img.alt = fullName;
      img.loading = "lazy";

      const fallbackDiv = document.createElement("div");
      fallbackDiv.className = "player-photo-fallback";
      fallbackDiv.style.display = "none";
      fallbackDiv.textContent = fullName
        .split(" ")
        .map((s) => s[0])
        .join("")
        .slice(0, 3)
        .toUpperCase();

      img.onerror = () => {
        img.style.display = "none";
        fallbackDiv.style.display = "flex";
      };

      photoDiv.appendChild(img);
      photoDiv.appendChild(fallbackDiv);
    }

    photoWrap.appendChild(photoDiv);

    // player main
    const mainDiv = document.createElement("div");
    mainDiv.className = "player-main";

    const nameDiv = document.createElement("div");
    nameDiv.className = "player-name";
    nameDiv.textContent = fullName;

    const metaDiv = document.createElement("div");
    metaDiv.className = "player-meta";

    const clubTag = document.createElement("span");
    clubTag.className = "tag club-name";
    clubTag.textContent = teamName;
    if (CLUB_COLORS[teamName]) {
      clubTag.style.borderColor = CLUB_COLORS[teamName];
      clubTag.style.color = CLUB_COLORS[teamName];
    }

    const posTag = document.createElement("span");
    posTag.className = "tag position";
    posTag.textContent = position;
	
    const smallXa = document.createElement("span");
    smallXa.textContent = `${player.gwPoints} xA`;
    smallXa.style.opacity = "0.8";

    metaDiv.appendChild(clubTag);
    metaDiv.appendChild(posTag);
    metaDiv.appendChild(smallXa);

    mainDiv.appendChild(nameDiv);
    mainDiv.appendChild(metaDiv);

    const clubCell = document.createElement("div");
    clubCell.className = "stat";
    clubCell.textContent = teamName;

    const posCell = document.createElement("div");
    posCell.className = "stat header-cell-right";
    posCell.textContent = position;

    const xaCell = document.createElement("div");
    xaCell.className = "points";

    const xaBadge = document.createElement("div");
    xaBadge.className = "points-badge";
    const dotSpan = document.createElement("span");
    dotSpan.className = "points-dot";
    const xaLabel = document.createElement("span");
    xaLabel.textContent = `${player.gwPoints} xA`; // same number, different label for now
    xaBadge.appendChild(dotSpan);
    xaBadge.appendChild(xaLabel);
    xaCell.appendChild(xaBadge);

    row.appendChild(rankDiv);
    row.appendChild(photoWrap);
    row.appendChild(mainDiv);
    row.appendChild(clubCell);
    row.appendChild(posCell);
    row.appendChild(xaCell);

    xaPlayersListEl.appendChild(row);
  });

  if (xaUpdatedTimeEl) {
    xaUpdatedTimeEl.textContent = formatTime(new Date());
  }
  if (xaStatusMessageEl) {
    xaStatusMessageEl.textContent = ""; // clear any previous message
  }
}

function renderTop10ToXgi(top10, teamMap) {
  if (!xgiPlayersListEl) return; // if the xG tab isn't in the HTML, do nothing

  // Clear any empty state
  xgiPlayersListEl.innerHTML = "";

  top10.forEach((player, index) => {
    const teamName = teamMap.get(player.teamId) || "Unknown";
    const position = ELEMENT_TYPES[player.positionId] || "-";
    const fullName =
      (player.firstName ? player.firstName + " " : "") +
      (player.secondName || player.webName);
    const photoUrl = buildPlayerPhotoUrl(player.photo);

    const row = document.createElement("div");
    row.className = "player-row";

    // rank
    const rankDiv = document.createElement("div");
    rankDiv.className =
      "rank-badge " +
      (index === 0 ? "rank-1" : index <= 2 ? "rank-1-lite" : "");
    rankDiv.textContent = index + 1;

    const photoWrap = document.createElement("div");
    photoWrap.className = "player-photo-wrap";
    const photoDiv = document.createElement("div");
    photoDiv.className = "player-photo";

    if (photoUrl) {
      const img = document.createElement("img");
      img.src = photoUrl;
      img.alt = fullName;
      img.loading = "lazy";

      const fallbackDiv = document.createElement("div");
      fallbackDiv.className = "player-photo-fallback";
      fallbackDiv.style.display = "none";
      fallbackDiv.textContent = fullName
        .split(" ")
        .map((s) => s[0])
        .join("")
        .slice(0, 3)
        .toUpperCase();

      img.onerror = () => {
        img.style.display = "none";
        fallbackDiv.style.display = "flex";
      };

      photoDiv.appendChild(img);
      photoDiv.appendChild(fallbackDiv);
    }

    photoWrap.appendChild(photoDiv);

    // player main
    const mainDiv = document.createElement("div");
    mainDiv.className = "player-main";

    const nameDiv = document.createElement("div");
    nameDiv.className = "player-name";
    nameDiv.textContent = fullName;

    const metaDiv = document.createElement("div");
    metaDiv.className = "player-meta";

    const clubTag = document.createElement("span");
    clubTag.className = "tag club-name";
    clubTag.textContent = teamName;
    if (CLUB_COLORS[teamName]) {
      clubTag.style.borderColor = CLUB_COLORS[teamName];
      clubTag.style.color = CLUB_COLORS[teamName];
    }

    const posTag = document.createElement("span");
    posTag.className = "tag position";
    posTag.textContent = position;
	
    const smallXgi = document.createElement("span");
    smallXa.textContent = `${player.gwPoints} xGI`;
    smallXa.style.opacity = "0.8";

    metaDiv.appendChild(clubTag);
    metaDiv.appendChild(posTag);
    metaDiv.appendChild(smallXgi);

    mainDiv.appendChild(nameDiv);
    mainDiv.appendChild(metaDiv);

    const clubCell = document.createElement("div");
    clubCell.className = "stat";
    clubCell.textContent = teamName;

    const posCell = document.createElement("div");
    posCell.className = "stat header-cell-right";
    posCell.textContent = position;

    const xgiCell = document.createElement("div");
    xgiCell.className = "points";

    const xgiBadge = document.createElement("div");
    xgiBadge.className = "points-badge";
    const dotSpan = document.createElement("span");
    dotSpan.className = "points-dot";
    const xgiLabel = document.createElement("span");
    xgiLabel.textContent = `${player.gwPoints} xGI`; // same number, different label for now
    xgiBadge.appendChild(dotSpan);
    xgiBadge.appendChild(xgiLabel);
    xgiCell.appendChild(xgiBadge);

    row.appendChild(rankDiv);
    row.appendChild(photoWrap);
    row.appendChild(mainDiv);
    row.appendChild(clubCell);
    row.appendChild(posCell);
    row.appendChild(xgiCell);

    xgiPlayersListEl.appendChild(row);
  });

  if (xgiUpdatedTimeEl) {
    xgiUpdatedTimeEl.textContent = formatTime(new Date());
  }
  if (xgiStatusMessageEl) {
    xgiStatusMessageEl.textContent = ""; // clear any previous message
  }
}

async function fetchTop10ForCurrentGW() {
  showLoading();
  setStatus("");

  try {
    // 1) Get bootstrap-static for players + teams + events via your Node proxy
    const bootstrapRes = await fetch(`${BACKEND_BASE}/api/data`, {
      credentials: "omit",
    });
    if (!bootstrapRes.ok) {
      throw new Error("Failed to load bootstrap-static");
    }
    const bootstrap = await bootstrapRes.json();
    const { events, elements, teams } = bootstrap;

    // 2) Detect current Gameweek
    let currentEvent = events.find((ev) => ev.is_current);
    if (!currentEvent) {
      // Fallback for pre-season or post-season
      const activeEvents = events.filter(
        (ev) => ev.finished === false && ev.is_next
      );
      if (activeEvents.length) {
        currentEvent = activeEvents[0];
      } else {
        // fallback: last event
        currentEvent = events[events.length - 1];
      }
    }

    currentGW = currentEvent.id;
    gwTextEl.textContent = `Gameweek ${currentEvent.id} – ${currentEvent.name}`;

    // 3) Get live stats for that GW
    const liveRes = await fetch(`${BACKEND_BASE}/api/live/${currentGW}`, {
      credentials: "omit",
    });
    if (!liveRes.ok) {
      throw new Error("Failed to load live stats for current Gameweek");
    }
    const liveData = await liveRes.json();
    const liveElements = liveData.elements || [];

    // 4) Build a map from element id -> stats (total_points this GW)
    const liveMap = new Map();
    for (const item of liveElements) {
      const gwPoints = item.stats.total_points;
      liveMap.set(item.id, gwPoints);
    }

    // 5) Merge bootstrap elements with live GW points
    const playersWithPoints = elements
      .map((player) => {
        const gwPoints = liveMap.get(player.id) ?? 0;
        return {
          id: player.id,
          firstName: player.first_name,
          secondName: player.second_name,
          webName: player.web_name,
          code: player.code,
          photo: player.photo,
          gwPoints,
          teamId: player.team,
          positionId: player.element_type,
        };
      })
      .filter((p) => p.gwPoints > 0); // filter out zero-point players

    if (!playersWithPoints.length) {
      showEmpty(
        "No players have points yet for this Gameweek. The matches might not have started."
      );
    }

    // 6) Sort by gwPoints descending, then by name as tiebreaker
    playersWithPoints.sort((a, b) => {
      if (b.gwPoints !== a.gwPoints) return b.gwPoints - a.gwPoints;
      const nameA = (a.webName || "").toLowerCase();
      const nameB = (b.webName || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // 7) Take top 10
    const top10 = playersWithPoints.slice(0, 20);
    lastTop10 = top10; // store for xG tab

    // 8) Map teamId to team name
    const teamMap = new Map();
    teams.forEach((t) => {
      teamMap.set(t.id, t.name);
    });

    // 9) Render into main tab
    renderTop10ToMain(top10, teamMap);

    updatedTimeEl.textContent = formatTime(new Date());
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Unexpected error while loading FPL data", true);
    showEmpty("Could not fetch FPL data. Please try again later.");

    if (xgStatusMessageEl) {
      xgStatusMessageEl.textContent =
        "Could not fetch FPL data. xG tab is also unavailable.";
    }
  }
}


async function fetchTop10xGForCurrentGW() {
  showLoading();
  setStatus("");

  try {
    // 1) Get bootstrap-static for players + teams + events via your Node proxy
    const bootstrapRes = await fetch(`${BACKEND_BASE}/api/data`, {
      credentials: "omit",
    });
    if (!bootstrapRes.ok) {
      throw new Error("Failed to load bootstrap-static");
    }
    const bootstrap = await bootstrapRes.json();
    const { events, elements, teams } = bootstrap;

    // 2) Detect current Gameweek
    let currentEvent = events.find((ev) => ev.is_current);
    if (!currentEvent) {
      // Fallback for pre-season or post-season
      const activeEvents = events.filter(
        (ev) => ev.finished === false && ev.is_next
      );
      if (activeEvents.length) {
        currentEvent = activeEvents[0];
      } else {
        // fallback: last event
        currentEvent = events[events.length - 1];
      }
    }

    currentGW = currentEvent.id;
    gwxgTextEl.textContent = `Gameweek ${currentEvent.id} – ${currentEvent.name}`;

    // 3) Get live stats for that GW
    const liveRes = await fetch(`${BACKEND_BASE}/api/live/${currentGW}`, {
      credentials: "omit",
    });
    if (!liveRes.ok) {
      throw new Error("Failed to load live stats for current Gameweek");
    }
    const liveData = await liveRes.json();
    const liveElements = liveData.elements || [];

    // 4) Build a map from element id -> stats (total_points this GW)
    const liveMap = new Map();
    for (const item of liveElements) {
      const gwPoints = item.stats.expected_goals;
      liveMap.set(item.id, gwPoints);
    }

    // 5) Merge bootstrap elements with live GW points
    const playersWithPoints = elements
      .map((player) => {
        const gwPoints = liveMap.get(player.id) ?? 0;
        return {
          id: player.id,
          firstName: player.first_name,
          secondName: player.second_name,
          webName: player.web_name,
          code: player.code,
          photo: player.photo,
          gwPoints,
          teamId: player.team,
          positionId: player.element_type,
        };
      })
      .filter((p) => p.gwPoints > 0); // filter out zero-point players

    if (!playersWithPoints.length) {
      showEmpty(
        "No players have points yet for this Gameweek. The matches might not have started."
      );
    }

    // 6) Sort by gwPoints descending, then by name as tiebreaker
    playersWithPoints.sort((a, b) => {
      if (b.gwPoints !== a.gwPoints) return b.gwPoints - a.gwPoints;
      const nameA = (a.webName || "").toLowerCase();
      const nameB = (b.webName || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // 7) Take top 10
    const top10 = playersWithPoints.slice(0, 20);
    lastTop10 = top10; // store for xG tab

    // 8) Map teamId to team name
    const teamMap = new Map();
    teams.forEach((t) => {
      teamMap.set(t.id, t.name);
    });


    // 9) Also render the same data into xG tab (for now)
    renderTop10ToXg(top10, teamMap);

    updatedTimeEl.textContent = formatTime(new Date());
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Unexpected error while loading FPL data", true);
    showEmpty("Could not fetch FPL data. Please try again later.");

    if (xgStatusMessageEl) {
      xgStatusMessageEl.textContent =
        "Could not fetch FPL data. xG tab is also unavailable.";
    }
  }
}



async function fetchTop10xAForCurrentGW() {
  showLoading();
  setStatus("");

  try {
    // 1) Get bootstrap-static for players + teams + events via your Node proxy
    const bootstrapRes = await fetch(`${BACKEND_BASE}/api/data`, {
      credentials: "omit",
    });
    if (!bootstrapRes.ok) {
      throw new Error("Failed to load bootstrap-static");
    }
    const bootstrap = await bootstrapRes.json();
    const { events, elements, teams } = bootstrap;

    // 2) Detect current Gameweek
    let currentEvent = events.find((ev) => ev.is_current);
    if (!currentEvent) {
      // Fallback for pre-season or post-season
      const activeEvents = events.filter(
        (ev) => ev.finished === false && ev.is_next
      );
      if (activeEvents.length) {
        currentEvent = activeEvents[0];
      } else {
        // fallback: last event
        currentEvent = events[events.length - 1];
      }
    }

    currentGW = currentEvent.id;
    gwxaTextEl.textContent = `Gameweek ${currentEvent.id} – ${currentEvent.name}`;

    // 3) Get live stats for that GW
    const liveRes = await fetch(`${BACKEND_BASE}/api/live/${currentGW}`, {
      credentials: "omit",
    });
    if (!liveRes.ok) {
      throw new Error("Failed to load live stats for current Gameweek");
    }
    const liveData = await liveRes.json();
    const liveElements = liveData.elements || [];

    // 4) Build a map from element id -> stats (total_points this GW)
    const liveMap = new Map();
    for (const item of liveElements) {
      const gwPoints = item.stats.expected_assists;
      liveMap.set(item.id, gwPoints);
    }

    // 5) Merge bootstrap elements with live GW points
    const playersWithPoints = elements
      .map((player) => {
        const gwPoints = liveMap.get(player.id) ?? 0;
        return {
          id: player.id,
          firstName: player.first_name,
          secondName: player.second_name,
          webName: player.web_name,
          code: player.code,
          photo: player.photo,
          gwPoints,
          teamId: player.team,
          positionId: player.element_type,
        };
      })
      .filter((p) => p.gwPoints > 0); // filter out zero-point players

    if (!playersWithPoints.length) {
      showEmpty(
        "No players have points yet for this Gameweek. The matches might not have started."
      );
    }

    // 6) Sort by gwPoints descending, then by name as tiebreaker
    playersWithPoints.sort((a, b) => {
      if (b.gwPoints !== a.gwPoints) return b.gwPoints - a.gwPoints;
      const nameA = (a.webName || "").toLowerCase();
      const nameB = (b.webName || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // 7) Take top 10
    const top10 = playersWithPoints.slice(0, 20);
    lastTop10 = top10; // store for xG tab

    // 8) Map teamId to team name
    const teamMap = new Map();
    teams.forEach((t) => {
      teamMap.set(t.id, t.name);
    });


    // 9) Also render the same data into xA tab (for now)
    renderTop10ToXa(top10, teamMap);

    updatedTimeEl.textContent = formatTime(new Date());
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Unexpected error while loading FPL data", true);
    showEmpty("Could not fetch FPL data. Please try again later.");

    if (xaStatusMessageEl) {
      xaStatusMessageEl.textContent =
        "Could not fetch FPL data. xA tab is also unavailable.";
    }
  }
}

async function fetchTop10xGIForCurrentGW() {
  showLoading();
  setStatus("");

  try {
    // 1) Get bootstrap-static for players + teams + events via your Node proxy
    const bootstrapRes = await fetch(`${BACKEND_BASE}/api/data`, {
      credentials: "omit",
    });
    if (!bootstrapRes.ok) {
      throw new Error("Failed to load bootstrap-static");
    }
    const bootstrap = await bootstrapRes.json();
    const { events, elements, teams } = bootstrap;

    // 2) Detect current Gameweek
    let currentEvent = events.find((ev) => ev.is_current);
    if (!currentEvent) {
      // Fallback for pre-season or post-season
      const activeEvents = events.filter(
        (ev) => ev.finished === false && ev.is_next
      );
      if (activeEvents.length) {
        currentEvent = activeEvents[0];
      } else {
        // fallback: last event
        currentEvent = events[events.length - 1];
      }
    }

    currentGW = currentEvent.id;
    gwxgiTextEl.textContent = `Gameweek ${currentEvent.id} – ${currentEvent.name}`;

    // 3) Get live stats for that GW
    const liveRes = await fetch(`${BACKEND_BASE}/api/live/${currentGW}`, {
      credentials: "omit",
    });
    if (!liveRes.ok) {
      throw new Error("Failed to load live stats for current Gameweek");
    }
    const liveData = await liveRes.json();
    const liveElements = liveData.elements || [];

    // 4) Build a map from element id -> stats (total_points this GW)
    const liveMap = new Map();
    for (const item of liveElements) {
      const gwPoints = item.stats.expected_goal_involments;
      liveMap.set(item.id, gwPoints);
    }

    // 5) Merge bootstrap elements with live GW points
    const playersWithPoints = elements
      .map((player) => {
        const gwPoints = liveMap.get(player.id) ?? 0;
        return {
          id: player.id,
          firstName: player.first_name,
          secondName: player.second_name,
          webName: player.web_name,
          code: player.code,
          photo: player.photo,
          gwPoints,
          teamId: player.team,
          positionId: player.element_type,
        };
      })
      .filter((p) => p.gwPoints > 0); // filter out zero-point players

    if (!playersWithPoints.length) {
      showEmpty(
        "No players have points yet for this Gameweek. The matches might not have started."
      );
    }

    // 6) Sort by gwPoints descending, then by name as tiebreaker
    playersWithPoints.sort((a, b) => {
      if (b.gwPoints !== a.gwPoints) return b.gwPoints - a.gwPoints;
      const nameA = (a.webName || "").toLowerCase();
      const nameB = (b.webName || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    // 7) Take top 10
    const top10 = playersWithPoints.slice(0, 20);
    lastTop10 = top10; // store for xG tab

    // 8) Map teamId to team name
    const teamMap = new Map();
    teams.forEach((t) => {
      teamMap.set(t.id, t.name);
    });


    // 9) Also render the same data into xGI tab (for now)
    renderTop10ToXgi(top10, teamMap);

    updatedTimeEl.textContent = formatTime(new Date());
  } catch (err) {
    console.error(err);
    setStatus(err.message || "Unexpected error while loading FPL data", true);
    showEmpty("Could not fetch FPL data. Please try again later.");

    if (xgiStatusMessageEl) {
      xgiStatusMessageEl.textContent =
        "Could not fetch FPL data. xGI tab is also unavailable.";
    }
  }
}


refreshBtn.addEventListener("click", () => {
  fetchTop10ForCurrentGW();
});





// ----- Tab Switching Logic (non-breaking) -----
(function setupTabs() {
  const tabTop10GW = document.getElementById("tabTop10GW");
  const tabTop10xG = document.getElementById("tabTop10xG");
  const tabTop10xA = document.getElementById("tabTop10xA");
  const tabTop10xGI = document.getElementById("tabTop10xGI");
  const gwTabPanel = document.getElementById("gwTabPanel");
  const xgTabPanel = document.getElementById("xgTabPanel");
  const xaTabPanel = document.getElementById("xaTabPanel");
  const xgiTabPanel = document.getElementById("xgiTabPanel");

  if (!tabTop10GW || !tabTop10xG || !tabTop10xA || !tabTop10xGI || !gwTabPanel || !xgTabPanel || !xaTabPanel || !xgiTabPanel) return;

  function activateTab(tab) {
    const isGWTab = tab === "gw";
    const isXgTab = tab === "xg";
    const isXaTab = tab === "xa";
	const isXgiTab = tab === "xgi";

    // Buttons
    tabTop10GW.classList.toggle("tab-button-active", isGWTab);
    tabTop10GW.setAttribute("aria-selected", isGWTab ? "true" : "false");

    tabTop10xG.classList.toggle("tab-button-active", isXgTab);
    tabTop10xG.setAttribute("aria-selected", isXgTab ? "true" : "false");

    tabTop10xA.classList.toggle("tab-button-active", isXaTab);
    tabTop10xA.setAttribute("aria-selected", isXaTab ? "true" : "false");
	
	tabTop10xGI.classList.toggle("tab-button-active", isXgiTab);
    tabTop10xGI.setAttribute("aria-selected", isXgiTab ? "true" : "false");

    // Panels
    gwTabPanel.classList.toggle("tab-panel-hidden", !isGWTab);
    xgTabPanel.classList.toggle("tab-panel-hidden", !isXgTab);
    xaTabPanel.classList.toggle("tab-panel-hidden", !isXaTab);
	xgiTabPanel.classList.toggle("tab-panel-hidden", !isXgiTab);

    // Load data for the active tab
    if (isGWTab) {
      // main GW top-10
      fetchTop10ForCurrentGW();
    } else if (isXgTab) {
      // xG top-10
      fetchTop10xGForCurrentGW();
    } else if (isXaTab) {
      // xA top-10
      fetchTop10xAForCurrentGW();
    } else if (isXgiTab) {
      // xGI top-10
      fetchTop10xGIForCurrentGW();
    }
  }

  tabTop10GW.addEventListener("click", () => activateTab("gw"));
  tabTop10xG.addEventListener("click", () => activateTab("xg"));
  tabTop10xA.addEventListener("click", () => activateTab("xa"));
  tabTop10xGI.addEventListener("click", () => activateTab("xgi"));

  // Start on GW tab and load its data
  activateTab("gw");
})();


(function setupXgRefresh() {
  if (!refreshXgBtn) return;

  refreshXgBtn.addEventListener("click", async () => {
    try {
 
      await fetchTop10xGForCurrentGW();
    } catch (e) {
      console.error("Error refreshing xG data:", e);
    }
  });
})();

(function setupXaRefresh() {
  if (!refreshXaBtn) return;

  refreshXaBtn.addEventListener("click", async () => {
    try {
      await fetchTop10xAForCurrentGW();
    } catch (e) {
      console.error("Error refreshing xA data:", e);
    }
  });

})();


(function setupXgiRefresh() {
  if (!refreshXgiBtn) return;

  refreshXgiBtn.addEventListener("click", async () => {
    try {
      await fetchTop10xGIForCurrentGW();
    } catch (e) {
      console.error("Error refreshing xGI data:", e);
    }
  });

})();





