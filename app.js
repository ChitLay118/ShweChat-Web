// ၁။ Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD355MSuzGQ70An7M7rdG8APTqk-xtgFoM",
    authDomain: "shwechatmm.firebaseapp.com",
    projectId: "shwechatmm",
    storageBucket: "shwechatmm.appspot.com",
    messagingSenderId: "904518107602",
    appId: "1:904518107602:android:89231af7657c3ded44880b"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let activeChatId = null;
let currentTab = 'chats';

// ၂။ Auth Logic
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const authBtn = document.getElementById('btn-auth-main');
let isLoginMode = true;

document.getElementById('auth-toggle').onclick = () => {
    isLoginMode = !isLoginMode;
    authBtn.innerText = isLoginMode ? 'Login' : 'Register';
    document.getElementById('reg-name').classList.toggle('hidden', isLoginMode);
    document.getElementById('auth-toggle').innerText = isLoginMode ? "Don't have an account? Register" : "Already have an account? Login";
};

authBtn.onclick = async () => {
    const email = document.getElementById('auth-email').value;
    const pass = document.getElementById('auth-password').value;
    try {
        if (isLoginMode) {
            await auth.signInWithEmailAndPassword(email, pass);
        } else {
            const name = document.getElementById('reg-name').value;
            const res = await auth.createUserWithEmailAndPassword(email, pass);
            await db.collection("Users").document(res.user.uid).set({
                uid: res.user.uid, name, email, profilePic: ""
            });
        }
    } catch (e) { alert(e.message); }
};

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        authScreen.classList.add('hidden');
        mainScreen.classList.remove('hidden');
        switchTab('chats');
    } else {
        authScreen.classList.remove('hidden');
        mainScreen.classList.add('hidden');
    }
});

document.getElementById('btn-logout').onclick = () => auth.signOut();

// ၃။ Navigation & Tabs
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    event.target.classList.add('active');
    
    if (tab === 'chats') loadRecentChats();
    else if (tab === 'friends') loadFriends();
    else if (tab === 'profile') showProfile();
}

// ၄။ Friends System (Gmail Search)
function loadFriends() {
    const content = document.getElementById('content-area');
    content.innerHTML = `
        <div class="auth-container">
            <input type="text" id="search-email" placeholder="Search by Gmail">
            <button onclick="searchFriend()">Search & Add</button>
        </div>
        <div id="friends-list"></div>
    `;
    
    db.collection("Users").doc(currentUser.uid).collection("Friends").onSnapshot(snap => {
        const list = document.getElementById('friends-list');
        if (!list) return;
        list.innerHTML = "";
        snap.forEach(doc => {
            const f = doc.data();
            list.innerHTML += `<div class="user-item" onclick="openChat('${f.uid}', '${f.name}')"><b>${f.name}</b><br>${f.email}</div>`;
        });
    });
}

async function searchFriend() {
    const email = document.getElementById('search-email').value;
    const snap = await db.collection("Users").where("email", "==", email).get();
    if (snap.empty) return alert("User not found!");
    const f = snap.docs[0].data();
    await db.collection("Users").doc(currentUser.uid).collection("Friends").doc(f.uid).set(f);
    alert("Friend Added!");
}

// ၅။ Chat System
function openChat(uid, name) {
    activeChatId = uid;
    document.getElementById('main-screen').classList.add('hidden');
    document.getElementById('chat-screen').classList.remove('hidden');
    document.getElementById('chat-user-name').innerText = name;
    loadMessages(uid);
}

function loadMessages(friendUid) {
    const myUid = currentUser.uid;
    const roomId = myUid > friendUid ? myUid + "_" + friendUid : friendUid + "_" + myUid;
    
    db.collection("Chats").doc(roomId).collection("Messages").orderBy("timestamp", "asc").onSnapshot(snap => {
        const list = document.getElementById('message-list');
        list.innerHTML = "";
        snap.forEach(doc => {
            const m = doc.data();
            const cls = m.senderId === myUid ? 'sent' : 'received';
            list.innerHTML += `<div class="msg ${cls}">${m.message}</div>`;
        });
        list.scrollTop = list.scrollHeight;
    });
}

document.getElementById('btn-send').onclick = async () => {
    const msg = document.getElementById('msg-input').value;
    if (!msg) return;
    const friendUid = activeChatId;
    const roomId = currentUser.uid > friendUid ? currentUser.uid + "_" + friendUid : friendUid + "_" + currentUser.uid;
    
    await db.collection("Chats").doc(roomId).collection("Messages").add({
        senderId: currentUser.uid,
        message: msg,
        timestamp: Date.now()
    });
    
    // Native Java ဘက်ကို Noti ပို့ခိုင်းဖို့ Trigger လုပ်မယ် (နောက်မှရေးမယ်)
    document.getElementById('msg-input').value = "";
};

function backToMain() {
    document.getElementById('main-screen').classList.remove('hidden');
    document.getElementById('chat-screen').classList.add('hidden');
}

// ၆။ Calling Trigger (Bridge to Java)
function triggerCall(type) {
    if (window.Android) {
        window.Android.startCall(activeChatId, type);
    } else {
        alert("Calling only works in App!");
    }
}
