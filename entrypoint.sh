if test -f "/tmp/.X1-lock"; then
	echo "[Xvfb] file /tmp/.X1-lock detected. Removing."
	rm /tmp/.X1-lock
fi

if [ ! -d "/tmp/.X11-unix" ]; then
	echo "[Xvfb] file /tmp/.X11-unix not detected. Creating."
	mkdir /tmp/.X11-unix
	sudo chmod 1777/tmp/.X11-unix
	sudo chown root /tmp/.X11-unix/
fi

echo "[Xvfb] Starting virtual screen with Xvfb."
Xvfb :1 -screen 0 1360x1020x24 &
export DISPLAY=:1

npm start
