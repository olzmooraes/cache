import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import axios from "axios";
import NodeCache from "node-cache";
import { AddressInfo } from "net";

const app = express();
const URL_API = "https://mqjnto3qw2.execute-api.us-east-1.amazonaws.com/default";
const myCache = new NodeCache({ stdTTL: 600, checkperiod: 60 });

app.use(express.json());
app.use(cors());

app.get("/playlist/:id", async (req: Request, res: Response) => {
  // TODO: Implementar cache para as musicas da playlist
  // TODO: Tem como melhorar? Sim né...
  try {
    const playlistId = req.params.id;
    const tokenKey = `token-${playlistId}`
    let tokenCache : string = myCache.get(tokenKey);
  if (!tokenCache) {
    const response = await axios.post(`${URL_API}/user/login`, {
        email: process.env.USER_EMAIL,
        password: process.env.USER_PASSWORD,
    });
    tokenCache = response.data.token
    myCache.set(tokenKey, tokenCache, 3600);
  }
  let playlist = await getPlaylistById(playlistId, tokenCache)
  const promisses = playlist.map( (e:any) =>{
    getSongByIdCached(e,tokenCache)
  })
  let musics = Promise.all(promisses)
  res.send(musics)
  } catch (e: any) {
    res.send(e.sqlMessage || e.message);
  }
});

// Endpoint para obter uma música por ID
// TODO: Tem como melhorar? E depois de cache da musica, tem como melhorar?
app.get("/song/:id", async (req: Request, res: Response) => {
  try {
    const songId = req.params.id;
    console.log(songId)
    const tokenKey = `token-${songId}`
    let tokenCache : string = myCache.get(tokenKey);
  if (!tokenCache) {
    console.log(process.env.USER_EMAIL, process.env.USER_PASSWORD)
    const response = await axios.post(`${URL_API}/user/login`, {
        email: process.env.USER_EMAIL,
        password: process.env.USER_PASSWORD,
    });
    console.log("response", response)
    tokenCache = response.data.token
    myCache.set(tokenKey, tokenCache, 3600);
  }
  let song = await  getSongByIdCached(songId,tokenCache)
  res.send(song);
} catch (e: any) {
    res.send(e.sqlMessage || e.message);
}
});
async function getSongById(id: string, token: string) {
  const song = await axios.get(`${URL_API}/song/${id}`, {
    headers: {
      Authorization: token,
    },
  });
  return song.data;
}
async function getPlaylistById(id: string, token: string) {
  const playlist = await axios.get(`${URL_API}/playlist/${id}`, {
    headers: {
      Authorization: token,
    },
  });
  return playlist.data;
}


// Função modificada para buscar música usando o token armazenado em cache
async function getSongByIdCached(id: string, token: string) {
  const songKey = `song-${id}`
  let song = myCache.get(songKey);

  if (!song) {
    const response = await axios.get(`${URL_API}/song/${id}`, {
      headers: {
        Authorization: token,
      },
    });
    song = response.data;
    myCache.set(songKey, song, 3600);  // Cache a música por 1 hora
  }

  return song;
}

const server = app.listen(process.env.PORT || 3003, () => {
  const address = server.address() as AddressInfo;
  console.log(`Server is running in http://localhost:${address.port}`);
});
