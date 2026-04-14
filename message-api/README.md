# message-api（投稿后端）

前端 `index.html` 会请求：

- `GET http://localhost:8080/api/messages`
- `POST http://localhost:8080/api/messages`

本目录提供一个轻量可运行的后端（Flask + SQLite），用于让“投递箱/种星”功能立即可用。

## 启动

在项目根目录（`小王子`）打开 PowerShell，执行：

```powershell
cd .\message-api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r .\requirements.txt
python .\app.py
```

看到类似 `Running on http://127.0.0.1:8080` 就说明启动成功。

## 验证

浏览器打开 `http://localhost:8080/health`，应返回 `{"ok":true}`。

然后再打开前端页面（你现在那个 The Little Prince 页面），点击“种下一颗星”就不会再报“后端未启动”了。

