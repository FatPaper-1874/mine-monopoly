import axios from "axios";

export const getRoleList = async () => {
    const {total, roleList, current} = (await axios.get("/role/list", {params: {page: -1}})).data as any;
    return {total, roleList, current};
};
