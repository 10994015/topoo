// stores/auth.js - 認證相關的 store
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

export const useAuthStore = defineStore('auth', () => {
    const URL = 'https://orrsystem.test.angke.com.tw/api' 
    const login = async (credentials)=>{
        console.log("sha256後:",hashSHA256(credentials.password));
        credentials.password = await hashSHA256(credentials.password); // 將密碼轉換為 SHA-256 雜湊值
        try {
            const response = await axios.post(`${URL}/login`, credentials)
            console.log(response.data);
            return;
            
            if (response.data.success) {
                
                return { success: true }
            } else {
                return { success: false, error: response.data.message }
            }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }


    async function hashSHA256(message) {
        const encoder = new TextEncoder();
        const data = encoder.encode(message); // 編碼成 Uint8Array
        const hashBuffer = await crypto.subtle.digest('SHA-256', data); // 計算 SHA-256 雜湊
        const hashArray = Array.from(new Uint8Array(hashBuffer)); // 轉成 byte 陣列
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // 轉成十六進位字串
        return hashHex;
      }

    return {
        login,
    }
})