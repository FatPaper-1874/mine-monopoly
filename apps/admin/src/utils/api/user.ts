import { _axios } from "@/utils/axios";

export const updateUser = async (id: string, username: string, password: string, avatar: string, color: string) => {
    await _axios.post("/user/update", {id, username, password, avatar, color});
};

export const createUser = async (username: string, password: string, avatar: string, color: string) => {
    await _axios.post("/user/create", {username, password, avatar, color});
};

export const deleteUser = async (id: string) => {
    await _axios.delete("/user/delete", {params: {id}});
};

export const getUserList = async (page: number, size: number) => {
    const {total, userList, current} = (await _axios.get("/user/list", {params: {page, size}})) as any;
    return {total, userList, current};
};

export const getLoginCode = async () => {
    const res = (await _axios.get("/user/get-login-code")) as any;
    return res as { img: { type: string; data: number[] }; uuid: string };
};

export const getLoginCodeState = async (uuid: string) => {
    const res = (await _axios.get(`/user/get-code-state?uuid=${uuid}`)) as any;
    return res as { codeState: number; token?: string };
};

export const isAdmin = async () => {
    const res = (await _axios.get(`/user/is-admin`)) as any;
    return res as { isAdmin: boolean };
};

export const checkAdminIdentity = () =>
    new Promise<boolean>(async (resolve, reject) => {
        try {
            const _isAdmin = (await isAdmin()).isAdmin;
            if (_isAdmin) {
                resolve(true);
            } else {
                reject(false);
            }
        } catch (e) {
            reject(false);
        }
    });
