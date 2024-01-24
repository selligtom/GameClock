import db from "./firebaseConfig";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  getDoc,
  query,
  where,
} from "firebase/firestore";
import { getGameId, getGameLogo, getGameHeroe } from "../api/steamgriddb";

//Teams
export async function getTeams() {
  const teamsList = [];
  const teamsSnapshot = await getDocs(collection(db, "teams"));
  teamsSnapshot.forEach((doc) => {
    teamsList.push(doc.data());
  });
  return teamsList;
}

export async function addTeam(name) {
  let alreadyExists = false;
  const teamsRef = collection(db, "teams");
  const teamsSnapshot = await getDocs(teamsRef);
  teamsSnapshot.forEach((doc) => {
    if (doc.data().name == name) {
      alreadyExists = true;
    }
  });
  if (alreadyExists) return false;
  await setDoc(doc(teamsRef), {
    name: name,
  });
  return true;
}

//Sessions
export const getSessions = async () => {
  const sessionsList = [];
  const sessionsSnapshot = await getDocs(collection(db, "sessions"));
  sessionsSnapshot.forEach((doc) => {
    sessionsList.push(doc.data());
  });
  return sessionsList;
};

export async function addSession(teamName, gameName, duration, was_cool) {
  try {
    let gameAlreadyExists = false;
    let teamId;
    let gamePath = "";
    const gamesSnapshot = await getDocs(collection(db, "games"));
    for (let s of gamesSnapshot.docs) {
      if (s.data().name == gameName) {
        gameAlreadyExists = true;
        gamePath = s.id;
      }
    }

    const teamsSnapshot = await getDocs(collection(db, "teams"));
    for (let doc of teamsSnapshot.docs) {
      if (doc.data().name == teamName) {
        teamId = doc.id;
      }
    }
    if (!gameAlreadyExists) {
      const gamesRef = collection(db, "games");
      await setDoc(doc(gamesRef), {
        name: gameName,
      });
      await addImagesToGame(gameName);
      const gamesSnapshot = await getDocs(collection(db, "games"));
      for (let s of gamesSnapshot.docs) {
        if (s.data().name == gameName) {
          gamePath = s.id;
        }
      }
    }
    const sessionRef = collection(db, "sessions");
    await setDoc(doc(sessionRef), {
      duration: duration,
      was_cool: was_cool,
      date: new Date(),
      game: doc(collection(db, "games"), gamePath),
      team: doc(collection(db, "teams"), teamId),
    });
    return true;
  } catch (err) {
    return false;
  }
}

//Games
export async function getGames() {
  const gamesList = [];
  const gamesSnapshot = await getDocs(collection(db, "games"));
  gamesSnapshot.forEach((doc) => {
    gamesList.push(doc.data());
  });
  return gamesList;
}

export async function addImagesToGame(gameName) {
  //get the game in database
  let gameId = "";
  let game;
  const gamesSnapshot = await getDocs(collection(db, "games"));
  for (let s of gamesSnapshot.docs) {
    if (s.data().name == gameName) {
      gameId = s.id;
      game = s.data();
    }
  }

  //get the logo from steamgriddb
  const gameid = await getGameId(gameName);
  const gameLogo = await getGameLogo(gameid);
  const gameHeroe = await getGameHeroe(gameid);

  // Add the logo in database
  await setDoc(doc(db, "games", gameId), {
    name: game.name,
    logo: gameLogo,
    heroe: gameHeroe,
  });
}

export async function getFirstGamesByPlaytime(numberOfGames) {
  let games_to_return = [];
  const gamesSnapshot = await getDocs(collection(db, "games"));
  for (let g of gamesSnapshot.docs) {
    let p = await getGameTotalPlaytime(g.ref);
    games_to_return.push({
      name: g.data().name,
      playtime: p,
      heroe: g.data().heroe,
      joyRate: 0,
      icon: g.data().logo,
    });
  }
  return games_to_return
    .sort((a, b) => {
      return b.playtime - a.playtime;
    })
    .slice(0, numberOfGames);
}

async function getGameTotalPlaytime(gameRef) {
  let acc = 0;
  const q = query(collection(db, "sessions"), where("game", "==", gameRef));
  const sessions_on_game = await getDocs(q);
  for (const session of sessions_on_game.docs) {
    acc += session.data().duration;
  }
  return acc;
}
