if [ -z "$1" ]; then
    # バージョン番号が与えられていないとき
    PACKAGE_VERSION=$(cat package.json | jq -r ".version")
    VERSION=(${PACKAGE_VERSION//./ })
    # パッチバージョンをインクリメントする
    VERSION[2]=$((VERSION[2]+1))
else
    # バージョン番号が与えられているとき
    VERSION=(${1//./ })
    #先頭のvを削除する
    VERSION[0]=${VERSION[0]#v}
    # マイナーバージョンとパッチバージョンを結合する
    VERSION[1]=${VERSION[1]}${VERSION[2]}
    # パッチバージョンを0にする
    VERSION[2]=0
fi

DOT_VERSION=${VERSION[0]}.${VERSION[1]}.${VERSION[2]}
COMMA_VERSION=${VERSION[0]},${VERSION[1]},${VERSION[2]}

cat package.json | jq ".version|=\"$DOT_VERSION\"" > tmp && mv tmp package.json
cat manifest.json | jq ".header.version|=[$COMMA_VERSION] | .modules[0].version|=[$COMMA_VERSION]" > tmp && mv tmp manifest.json