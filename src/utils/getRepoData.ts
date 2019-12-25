import axios from 'axios';

export const getRepoData = async (org: string, repo: string): Promise<any> => {
  try {
    const res = await axios.get(`https://api.github.com/repos/${org}/${repo}`);
    console.log(res.data, 'data');
  } catch { /**/ }
  return;
};
