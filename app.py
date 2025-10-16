from flask import Flask, render_template_string, request
app = Flask(__name__)

@app.route("/")
def index():
    theme = request.args.get("theme", "light")
    toggle_url = "/?theme=" + ("dark" if theme == "light" else "light")

    css = """
    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
    a { display: inline-block; margin-top: 20px; padding: 10px 20px; border-radius: 5px;
        text-decoration: none; color: inherit; border: 1px solid currentColor; }
    """
    if theme == "dark":
        css += "body { background: #111; color: white; }"
    else:
        css += "body { background: white; color: black; }"

    return render_template_string(f"""
        <html><head><title>Flask Dark Mode</title><style>{css}</style></head>
        <body>
            <h1>Flask Dark Mode – {theme.title()} Theme</h1>
            <a href="{toggle_url}">Switch Theme</a>
        </body></html>
    """)

if __name__ == "__main__":
    app.run(debug=True)
