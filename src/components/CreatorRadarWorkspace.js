"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./CreatorRadarWorkspace.module.css";

const pipelineOptions = [
  { value: "new", label: "待評估" },
  { value: "priority", label: "優先接洽" },
  { value: "watchlist", label: "持續追蹤" },
  { value: "contacted", label: "已接洽" },
];

const defaultInput = {
  minFollowers: 1000,
  maxFollowers: 50000,
  platforms: ["instagram", "threads"],
  keywords: ["面試", "求職", "職涯", "課程"],
};

function formatFollowerCount(value) {
  if (!value && value !== 0) return "待確認";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value}`;
}

function getProfileKey(profile) {
  return `${profile.platform}:${profile.handle || profile.url}`;
}

export default function CreatorRadarWorkspace({
  initialProfiles = [],
  initialInput = defaultInput,
}) {
  const [query, setQuery] = useState(initialInput.keywords.join("、"));
  const [minFollowers, setMinFollowers] = useState(initialInput.minFollowers);
  const [maxFollowers, setMaxFollowers] = useState(initialInput.maxFollowers);
  const [platforms, setPlatforms] = useState(initialInput.platforms);
  const [profiles, setProfiles] = useState(initialProfiles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedState, setSavedState] = useState({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("internx-creator-radar-state");
      if (raw) {
        setSavedState(JSON.parse(raw));
      }
    } catch (storageError) {
      console.warn("Failed to load local state", storageError);
    }
  }, []);

  useEffect(() => {
    if (!Object.keys(savedState).length) return;
    window.localStorage.setItem(
      "internx-creator-radar-state",
      JSON.stringify(savedState),
    );
  }, [savedState]);

  useEffect(() => {
    runSearch();
    // We only want the initial hydration refresh once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = useMemo(() => {
    const total = profiles.length;
    const inRange = profiles.filter(
      (profile) =>
        !profile.followers ||
        (profile.followers >= minFollowers && profile.followers <= maxFollowers),
    ).length;
    const courseCreators = profiles.filter((profile) =>
      profile.tags?.some((tag) => ["線上課程", "顧問服務", "工作坊"].includes(tag)),
    ).length;
    const priority = Object.values(savedState).filter(
      (item) => item.pipeline === "priority",
    ).length;

    return { total, inRange, courseCreators, priority };
  }, [maxFollowers, minFollowers, profiles, savedState]);

  async function runSearch(event) {
    event?.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: query
            .split(/[、,\n]/)
            .map((keyword) => keyword.trim())
            .filter(Boolean),
          minFollowers: Number(minFollowers),
          maxFollowers: Number(maxFollowers),
          platforms,
        }),
      });

      if (!response.ok) {
        throw new Error("搜尋服務暫時無法使用");
      }

      const data = await response.json();
      setProfiles(data.profiles || []);
    } catch (requestError) {
      setError(requestError.message || "搜尋時發生未知問題");
    } finally {
      setLoading(false);
    }
  }

  function togglePlatform(platform) {
    setPlatforms((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform],
    );
  }

  function updatePipeline(profileKey, pipeline) {
    setSavedState((current) => ({
      ...current,
      [profileKey]: {
        ...(current[profileKey] || {}),
        pipeline,
      },
    }));
  }

  function updateMemo(profileKey, memo) {
    setSavedState((current) => ({
      ...current,
      [profileKey]: {
        ...(current[profileKey] || {}),
        memo,
      },
    }));
  }

  return (
    <main className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>InternX Internal Tool</span>
          <h1>Creator Radar for BD</h1>
          <p>
            幫實習通自動找出適合合作的職涯創作者，優先鎖定有課程、能回答求職問題，
            並且在 IG 或 Threads 已經累積一定聲量的帳號。
          </p>
        </div>

        <div className={styles.metricGrid}>
          <MetricCard label="候選名單" value={summary.total} hint="系統已整合種子名單與即時探索結果" />
          <MetricCard label="落在粉絲區間" value={summary.inRange} hint="符合 1K - 50K 或待人工複核" />
          <MetricCard label="可切課程合作" value={summary.courseCreators} hint="含課程、工作坊、顧問服務跡象" />
          <MetricCard label="優先接洽" value={summary.priority} hint="依你的內部標記即時統計" />
        </div>
      </section>

      <section className={styles.panel}>
        <form className={styles.searchPanel} onSubmit={runSearch}>
          <div className={styles.fieldBlock}>
            <label htmlFor="query">搜尋主題</label>
            <textarea
              id="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              rows={3}
              placeholder="例如：面試、履歷、職涯轉職、外商求職、產品經理、數位行銷"
            />
          </div>

          <div className={styles.inlineFields}>
            <div className={styles.fieldBlock}>
              <label htmlFor="minFollowers">最低粉絲</label>
              <input
                id="minFollowers"
                type="number"
                min="0"
                value={minFollowers}
                onChange={(event) => setMinFollowers(event.target.value)}
              />
            </div>

            <div className={styles.fieldBlock}>
              <label htmlFor="maxFollowers">最高粉絲</label>
              <input
                id="maxFollowers"
                type="number"
                min="0"
                value={maxFollowers}
                onChange={(event) => setMaxFollowers(event.target.value)}
              />
            </div>

            <div className={styles.fieldBlock}>
              <span>平台</span>
              <div className={styles.toggleRow}>
                {["instagram", "threads"].map((platform) => (
                  <button
                    key={platform}
                    className={platforms.includes(platform) ? styles.toggleActive : styles.toggle}
                    type="button"
                    onClick={() => togglePlatform(platform)}
                  >
                    {platform === "instagram" ? "Instagram" : "Threads"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.actionRow}>
            <button className={styles.primaryAction} type="submit" disabled={loading}>
              {loading ? "搜尋中..." : "重新搜尋候選創作者"}
            </button>
            <p>
              搜尋會先讀取種子名單，再用公開搜尋結果擴充新候選人，並自動依簡介與粉絲數估算合作優先度。
            </p>
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
        </form>
      </section>

      <section className={styles.resultsHeader}>
        <div>
          <span className={styles.eyebrow}>Workspace</span>
          <h2>合作名單工作台</h2>
        </div>
        <p>
          每張卡都能直接記錄內部備註與合作狀態，資料暫存在你的瀏覽器，不會寫回公開平台。
        </p>
      </section>

      <section className={styles.cardGrid}>
        {profiles.map((profile) => {
          const profileKey = getProfileKey(profile);
          const stored = savedState[profileKey] || {};

          return (
            <article key={profileKey} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <span className={styles.platformBadge}>
                    {profile.platform === "instagram" ? "IG" : "Threads"}
                  </span>
                  <h3>{profile.name}</h3>
                  <p className={styles.handle}>@{profile.handle}</p>
                </div>
                <div className={styles.scorePill}>{profile.score} 分</div>
              </div>

              <div className={styles.statRow}>
                <Stat label="粉絲" value={formatFollowerCount(profile.followers)} />
                <Stat label="貼文 / 串文" value={profile.posts || "待確認"} />
                <Stat label="合作切角" value={profile.collabAngleShort || "內容合作"} />
              </div>

              <p className={styles.bio}>{profile.bio}</p>

              <div className={styles.tagWrap}>
                {(profile.tags || []).map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>

              <div className={styles.sourceList}>
                {(profile.sourceNotes || []).slice(0, 2).map((source) => (
                  <span key={source}>{source}</span>
                ))}
              </div>

              <div className={styles.linkRow}>
                <a href={profile.url} target="_blank" rel="noreferrer">
                  開啟檔案
                </a>
                {profile.website ? (
                  <a href={profile.website} target="_blank" rel="noreferrer">
                    個站 / Link in bio
                  </a>
                ) : null}
              </div>

              <div className={styles.formMini}>
                <label>
                  內部狀態
                  <select
                    value={stored.pipeline || "new"}
                    onChange={(event) => updatePipeline(profileKey, event.target.value)}
                  >
                    {pipelineOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  BD 備註
                  <textarea
                    rows={3}
                    value={stored.memo || ""}
                    onChange={(event) => updateMemo(profileKey, event.target.value)}
                    placeholder="例如：適合做職涯問答、可談課程分潤、先從校園主題切入"
                  />
                </label>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

function MetricCard({ label, value, hint }) {
  return (
    <div className={styles.metricCard}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
