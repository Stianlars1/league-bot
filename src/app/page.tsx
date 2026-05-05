import { GamePicker } from "@/components/game-picker";
import { Header } from "@/components/header";

import styles from "./page.module.css";

export default function HomePage() {
  return (
    <>
      <Header live />
      <div className={styles.glowBack} aria-hidden />
      <main className={styles.main}>
        <GamePicker />
      </main>
      <footer className={styles.footer}>
        <span>peeked.app — public APIs only</span>
        <div className={styles.footerLinks}>
          <a href="https://developer.riotgames.com" target="_blank" rel="noreferrer">
            Riot dev portal ↗
          </a>
          <a href="https://stratz.com/api" target="_blank" rel="noreferrer">
            Stratz ↗
          </a>
          <a href="https://www.opendota.com" target="_blank" rel="noreferrer">
            OpenDota ↗
          </a>
        </div>
      </footer>
    </>
  );
}
