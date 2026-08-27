# Lista kroków:

0. Pobranie repozytorium z GitHuba:

```bash
git clone https://github.com/Lemonewa/NoteDrop
```

1. Uruchomienie dockera z glownego katalogu projektu:

```bash
docker compose -f docker/Docker up --build
```

Jeśli nie zadziała, spróbuj:

```bash
sudo docker compose -f docker/Docker up --build
```

2. Uruchomienie serwera w przeglądarce:

```text
http://localhost:8000
```
3. Obsluga:

Wciśnij przycisk HELP znajdujący się w lewym górnym rogu strony, aby zapoznać się z instrukcją obsługi konwertera.

4. Zatrzymanie:

```bash
docker compose -f docker/Docker down
```
