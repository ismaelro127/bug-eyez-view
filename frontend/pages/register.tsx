import { useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '../lib/apiFetch';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const router = useRouter();

  const handleRegister = async () => {
    const res = await apiFetch("/api/auth/register", {
  method: "POST",
  body: JSON.stringify({ email, password }),
});

const data = await res.json().catch(() => null);

if (res.ok) {
  router.push("/");
} else {
  setMsg(data?.error || data?.message || "Registration failed.");
}
  };

  return (
    <div className="bg-black min-h-screen flex flex-col items-center justify-center text-white">
      <h2 className="text-2xl mb-4">Register</h2>
      <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
        className="mb-2 p-2 rounded bg-gray-800" />
      <input value={password} type="password" onChange={e => setPassword(e.target.value)} placeholder="Password"
        className="mb-2 p-2 rounded bg-gray-800" />
      <button onClick={handleRegister} className="bg-purple-600 px-4 py-2 rounded">Register</button>
      {msg && <p className="mt-4 text-red-400">{msg}</p>}
    </div>
  );
}
