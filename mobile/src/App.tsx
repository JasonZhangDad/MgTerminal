import { useCallback, useEffect, useMemo, useState } from 'react';
import { createHost, loadHosts, parseQuickHost, saveHosts, type MobileHost } from './lib/hosts';

type TabId = 'hosts' | 'pair' | 'about';

export default function App() {
  const [tab, setTab] = useState<TabId>('hosts');
  const [hosts, setHosts] = useState<MobileHost[]>([]);
  const [quick, setQuick] = useState('');
  const [label, setLabel] = useState('');
  const [hostname, setHostname] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [desktopUrl, setDesktopUrl] = useState('http://127.0.0.1:8787');

  useEffect(() => {
    setHosts(loadHosts());
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const persist = useCallback((next: MobileHost[]) => {
    setHosts(next);
    saveHosts(next);
  }, []);

  const addHost = useCallback(() => {
    const fromQuick = parseQuickHost(quick);
    const host = createHost(
      fromQuick
        ? {
            label: label || fromQuick.label,
            hostname: fromQuick.hostname,
            port: fromQuick.port,
            username: username || fromQuick.username,
            note,
          }
        : {
            label,
            hostname,
            port: Number(port) || 22,
            username,
            note,
          },
    );
    if (!host.hostname) {
      showToast('请填写主机地址，或粘贴 user@host:port');
      return;
    }
    persist([host, ...hosts]);
    setQuick('');
    setLabel('');
    setHostname('');
    setPort('22');
    setUsername('');
    setNote('');
    showToast('已保存主机');
  }, [quick, label, hostname, port, username, note, hosts, persist, showToast]);

  const removeHost = useCallback(
    (id: string) => {
      persist(hosts.filter((h) => h.id !== id));
      showToast('已删除');
    },
    [hosts, persist, showToast],
  );

  const exportJson = useCallback(async () => {
    const payload = JSON.stringify(hosts, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      showToast('主机列表已复制到剪贴板');
    } catch {
      showToast('复制失败，请长按手动选择');
    }
  }, [hosts, showToast]);

  const openDesktopSite = useCallback(() => {
    window.open('https://shell.magies.top', '_blank', 'noopener,noreferrer');
  }, []);

  const sortedHosts = useMemo(
    () => [...hosts].sort((a, b) => b.updatedAt - a.updatedAt),
    [hosts],
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden>
          M
        </div>
        <div className="brand-text">
          <h1>MagiesTerminal</h1>
          <p>Android 伴侣 · 免商店 APK</p>
        </div>
      </header>

      <nav className="tab-bar" aria-label="主导航">
        <button type="button" className={`tab ${tab === 'hosts' ? 'active' : ''}`} onClick={() => setTab('hosts')}>
          主机
        </button>
        <button type="button" className={`tab ${tab === 'pair' ? 'active' : ''}`} onClick={() => setTab('pair')}>
          配对桌面
        </button>
        <button type="button" className={`tab ${tab === 'about' ? 'active' : ''}`} onClick={() => setTab('about')}>
          关于
        </button>
      </nav>

      <main className="app-main">
        {tab === 'hosts' && (
          <>
            <section className="card stack">
              <h2>添加主机</h2>
              <p className="muted">
                快速粘贴 <span className="kbd">user@host:22</span>，或分栏填写。本机仅本地保存，不上传。
              </p>
              <input
                className="field"
                placeholder="快速粘贴：user@192.168.1.10:22"
                value={quick}
                onChange={(e) => setQuick(e.target.value)}
              />
              <input className="field" placeholder="显示名称（可选）" value={label} onChange={(e) => setLabel(e.target.value)} />
              <div className="row">
                <input
                  className="field"
                  placeholder="主机名 / IP"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                />
                <input
                  className="field"
                  style={{ maxWidth: 88 }}
                  placeholder="端口"
                  inputMode="numeric"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                />
              </div>
              <input className="field" placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
              <textarea className="field textarea" placeholder="备注（可选）" value={note} onChange={(e) => setNote(e.target.value)} />
              <button type="button" className="btn btn-primary btn-block" onClick={addHost}>
                保存主机
              </button>
            </section>

            <section className="card">
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
                <h2 style={{ margin: 0 }}>主机列表 ({sortedHosts.length})</h2>
                <button type="button" className="btn btn-ghost" onClick={() => void exportJson()} disabled={sortedHosts.length === 0}>
                  导出 JSON
                </button>
              </div>
              {sortedHosts.length === 0 ? (
                <div className="empty">还没有主机。添加后可在桌面端导入或后续版本直连。</div>
              ) : (
                <div className="host-list">
                  {sortedHosts.map((host) => (
                    <div key={host.id} className="host-item">
                      <div>
                        <strong>{host.label}</strong>
                        <span>
                          {host.username ? `${host.username}@` : ''}
                          {host.hostname}:{host.port}
                        </span>
                        {host.note ? <span>{host.note}</span> : null}
                      </div>
                      <div className="stack" style={{ gap: 6 }}>
                        <span className="pill">本地</span>
                        <button type="button" className="btn btn-secondary" onClick={() => removeHost(host.id)}>
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {tab === 'pair' && (
          <>
            <section className="card stack">
              <h2>配对桌面 MagiesTerminal</h2>
              <p>
                手机 APK 当前为<strong>伴侣端</strong>：管理主机清单、后续接入会话跟随 / 遥控。
                完整 SSH 终端、AI Agent、SFTP 仍在桌面端完成。
              </p>
              <p>
                计划能力：扫描局域网桌面、输入 Follow 邀请码旁观终端、从手机触发「在桌面打开会话」。
              </p>
              <label className="muted" htmlFor="desktop-url">
                桌面伴侣服务地址（预留）
              </label>
              <input
                id="desktop-url"
                className="field"
                value={desktopUrl}
                onChange={(e) => setDesktopUrl(e.target.value)}
                placeholder="http://192.168.x.x:8787"
              />
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => showToast('配对协议开发中，当前版本先本地存主机')}
              >
                尝试连接桌面
              </button>
            </section>
            <section className="card stack">
              <h2>免商店安装</h2>
              <p>
                1. 在手机开启「允许安装未知应用」
                <br />
                2. 下载 <span className="kbd">MagiesTerminal-mobile-debug.apk</span>
                <br />
                3. 直接安装，无需 Google Play
              </p>
            </section>
          </>
        )}

        {tab === 'about' && (
          <>
            <section className="card stack">
              <h2>关于本 APK</h2>
              <p>
                MagiesTerminal Mobile v0.1.0（Android 伴侣）
                <br />
                与桌面版 <span className="kbd">v0.5.x</span> 同品牌，专注移动端主机清单与后续遥控。
              </p>
              <button type="button" className="btn btn-secondary btn-block" onClick={openDesktopSite}>
                打开 shell.magies.top
              </button>
            </section>
            <section className="card stack">
              <h2>路线图</h2>
              <p>
                · 已完成：离线主机簿、APK 壳、Claude 橙主题
                <br />
                · 下一步：桌面 LAN Follow / 邀请码旁观
                <br />
                · 之后：经桌面代理发起 SSH（手机不保存私钥为优先）
              </p>
            </section>
          </>
        )}
      </main>

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
