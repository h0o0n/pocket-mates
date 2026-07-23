# SelectFood

여러 사람의 취향을 모아 모두가 만족할 점심 메뉴를 추천하는 정적 웹앱입니다.

## 로컬 실행

개발 중에는 `menu-picker` 디렉터리를 정적 웹 서버로 실행하세요.

```powershell
npx serve menu-picker
```

## Vercel 배포

저장소 루트의 `vercel.json`은 `npm run build`를 실행하고 생성된 `dist` 디렉터리를
배포하도록 설정되어 있습니다. React나 `react-scripts`는 사용하지 않습니다.

1. 이 저장소를 GitHub, GitLab 또는 Bitbucket에 푸시합니다.
2. Vercel에서 **Add New → Project**를 선택하고 저장소를 가져옵니다.
3. Framework Preset은 **Other**, Root Directory는 저장소 루트로 둡니다.
4. Build Command와 Output Directory는 저장소의 `vercel.json` 설정을 사용합니다.

Vercel 프로젝트에 예전 설정이 남아 있다면 **Settings → Build and Deployment**에서
Build Command의 Override를 끄거나 `npm run build`로 변경하고, Output Directory는
Override를 끄거나 `dist`로 변경하세요.

Vercel CLI를 사용하는 경우 저장소 루트에서 다음 명령을 실행할 수도 있습니다.

```powershell
npx vercel
```

프로덕션 배포는 `npx vercel --prod`를 사용합니다.
