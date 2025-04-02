import axios from "axios";
import { config } from "./config";

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    id_token: string;
    scope: string;
    token_type: string;
    expires_in: number;
  }

export interface UserInfoResponse {
    id: string;
    name: string;
    displayName: string;
    email: string;
    preferredUsername: string;
}

export interface Timelog {
    uuid?: string;
    timestamp: string;
    duration?: number;
    activity: string;
    tag: string;
}

const GetLoginUrl = async (): Promise<string> => {
    const response = await axios.post<string>(`${config.backendApiUrl}/auth/login`);
    return response.data;
};

const GetTokenResponse = async (code: string, state: string): Promise<TokenResponse> => {
    try {
        const response = await axios.post<TokenResponse>(`${config.backendApiUrl}/auth/callback`, {
            code: code,
            state: state,
        });
        return response.data;
    } catch (error) {
        console.error("获取token失败:", error);
        throw error;
    }
};

const GetUserInfo = async (accessToken: string): Promise<UserInfoResponse> => {
    try {
        const response = await axios.get<UserInfoResponse>(
            `${config.backendApiUrl}/auth/user_info`,
            {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            }
        );

        const userInfo: UserInfoResponse = response.data;
        return userInfo;
    } catch (error: any) {
        console.error('Token 验证或获取用户信息失败', error);
        throw error;
    }
}

const getTimelogs = async (
    startDate: string, 
    endDate: string, 
    accessToken: string
): Promise<Timelog[]> => {
    try {
        const response = await axios.get<Timelog[]>(
            `${config.backendApiUrl}/timelogs`, 
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                params: {
                    start_date: startDate,
                    end_date: endDate
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('获取时间记录失败:', error);
        throw error;
    }
};

const createTimelog = async (
    timelog: Timelog, 
    accessToken: string
): Promise<{ message: string; id: string }> => {
    try {
        const response = await axios.post<{ message: string; id: string }>(
            `${config.backendApiUrl}/timelogs`,
            timelog,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('创建时间记录失败:', error);
        throw error;
    }
};

const deleteTimelog = async (
    uuid: string, 
    accessToken: string
): Promise<{ message: string }> => {
    try {
        const response = await axios.delete<{ message: string }>(
            `${config.backendApiUrl}/timelogs`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                params: { uuid }
            }
        );
        return response.data;
    } catch (error) {
        console.error('删除时间记录失败:', error);
        throw error;
    }
};

const updateTimelog = async (
    uuid: string, 
    timelog: Timelog, 
    accessToken: string
): Promise<{ message: string }> => {
    try {
        const response = await axios.put<{ message: string }>(
            `${config.backendApiUrl}/timelogs`,
            timelog,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                params: { uuid }
            }
        );
        return response.data;
    } catch (error) {
        console.error('更新时间记录失败:', error);
        throw error;
    }
};

export { 
    GetLoginUrl, 
    GetTokenResponse, 
    GetUserInfo, 
    getTimelogs, 
    createTimelog, 
    deleteTimelog, 
    updateTimelog 
};