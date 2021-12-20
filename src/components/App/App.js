import React from "react";
import { BrowserRouter as Router, Route, Navigate, Routes } from 'react-router-dom';
import { CurrentUserContext } from '../../contexts/CurrentUserContext';
import ProtectedRoute from '../../components/ProtectedRoute/ProtectedRoute';
import Main from '../Main/Main';
import Movies from '../Movies/Movies';
import SavedMovies from "../SavedMovies/SavedMovies";
import Profile from '../Profile/Profile';
import Login from '../Login/Login';
import Register from '../Register/Register';
import NotFound from '../NotFound/NotFound';
import InfoTooltip from '../InfoTooltip/InfoTooltip';
import Loader from '../Loader/Loader';
import {
  areas,
  appRoutes,
  appInitValues,
  defaultLoginTooltipData,
  localStorageKeys
} from "../../utils/constants";
import {
  isKeyExistInLocalStorage,
  filterMovies,
  transformFromBeatFilm,
  initialMoviesCount
} from "../../utils/utils";
import MainApi from "../../utils/MainApi";
import BeatFilm from '../../utils/MoviesApi';
import onSuccessResponse from '../../images/infotooltip/ok.svg';
import onFailureResponse from '../../images/infotooltip/fail.svg';
import './App.css';

function App() {

  const [filterCkeckboxSatate, setFilterCkeckboxSatate] = React.useState(false);
  const [filterCkeckboxSavedSatate, setfilterCkeckboxSavedSatate] = React.useState(false);

  const [currentUser, setCurrentUser] = React.useState(appInitValues.user);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [infoTooltipData, setInfoTooltipData] = React.useState(defaultLoginTooltipData);
  const [isInfoTooltipOpened, setInfoTooltipOpened] = React.useState(false);
  const [isLoaderOpened, setIsLoaderOpened] = React.useState(false);
  const [moviesCards, setMoviesCards] = React.useState([]);
  const [moviesCardsVisible, setMoviesCardsVisible] = React.useState([]);
  const [moviesCardsUnfiltered, setMoviesCardsUnfiltered] = React.useState([]);
  const [savedMovies, setSavedMovies] = React.useState([]);
  const [savedMoviesUnfiltered, setSavedMoviesUnfiltered] = React.useState([]);
  const [position, setPosition] = React.useState(0);

  /*
    API Responses
  */

  const displayResponseSuccess = (text) => {
    handleDisplayInfoTooltip({
      title: text,
      texts: [],
      image: onSuccessResponse
    });
  }

  const displayResponseError = (text, error) => {
    error.json()
      .then((err) => handleDisplayInfoTooltip({
        title: `${text} ${error.status} [${error.statusText}]`,
        texts: [err.message],
        image: onFailureResponse
      }))
      .catch((exeption) => console.error(exeption));
  }

  const displayUnknownError = React.useCallback(() => {
    handleDisplayInfoTooltip({
      title: 'Неизвестная ошибка',
      texts: [],
      image: onFailureResponse
    })
  }, []);

  /*
    Установка JWT и информации о пользователе
  */

  const handleGetSavedMovies = React.useCallback((jwt) => {
    MainApi.getSavedMovies(jwt)
      .then((result) => {
        setSavedMovies(result);
      })
      .catch((error) => {
        handleDisplayInfoTooltip({
          title: `Ошибка ${error.status} [${error.statusText}]`,
          texts: [],
          image: onFailureResponse
        });
      })
  }, []);

  const setUserInfoAndJWT = React.useCallback((jwt, initStage) => {
    MainApi.getUserInfo(jwt)
      .then((user) => {
        onSignIn({ user, jwt });
        handleGetSavedMovies(jwt);
      })
      .catch((error) => {
        localStorage.removeItem(localStorageKeys.jwt);
        try {
          error.json()
            .then((err) => initStage && error.status === 401 ? console.error(error) : handleDisplayInfoTooltip({
              title: `Ошибка проверки пользователя: ${error.status} [${error.statusText}]`,
              texts: [err.message],
              image: onFailureResponse
            }))
            .catch((exeption) => console.error(exeption));
        } catch {
          initStage ? console.error(error) : displayUnknownError();
        }
      });
  }, [displayUnknownError, handleGetSavedMovies]);

  /*
    Монтирование компонента App
  */

  React.useEffect(() => {

    const jwt = localStorage.getItem(localStorageKeys.jwt);

    if (jwt) {
      setUserInfoAndJWT(jwt, true);
    }
    setIsLoaderOpened(false);

    if (isKeyExistInLocalStorage(localStorageKeys.moviesCardsVisible)) {
      setMoviesCardsVisible(JSON.parse(localStorage.getItem(localStorageKeys.moviesCardsVisible)));
    }

  }, [setUserInfoAndJWT]);

  /*
    Аутентификация пользователя
  */

  const handleSignIn = ({ email, password }) => {
    MainApi.signIn({ email, password })
      .then((response) => {
        setUserInfoAndJWT(response.token, false);
      })
      .catch((error) => {
        try {
          displayResponseError('Ошибка входа:', error);
        } catch {
          displayUnknownError();
        }
      });
  }

  const handleSignUp = ({ name, email, password }) => {
    MainApi.signUp({ name, email, password })
      .then(() => {
        displayResponseSuccess('Вы успешно зарегистрировались!');
        handleSignIn({ email, password });
      })
      .catch((error) => {
        try {
          displayResponseError('Ошибка регистрации:', error);
        } catch {
          displayUnknownError();
        }
      });
  }

  const handleSignOut = () => {
    MainApi.signOut()
      .then(() => {
        onSignOut();
        displayResponseSuccess('Вы вышли из аккаунта');
      })
      .catch((error) => {
        try {
          displayResponseError('Ошибка выхода:', error);
        } catch {
          displayUnknownError();
        }
      });
  }

  const onSignIn = ({ user, jwt }) => {
    setIsLoggedIn(true);
    localStorage.setItem(localStorageKeys.jwt, jwt);
    setCurrentUser(user);
  }

  const onSignOut = () => {
    setIsLoggedIn(false);
    localStorage.removeItem(localStorageKeys.jwt);
    setCurrentUser(appInitValues.user);
  }

  /*
    Редактирование пользователя
  */
  const handleUpdateUserInfo = ({ _id, email, name }, handleNewUserInfo) => {

    const jwt = localStorage.getItem(localStorageKeys.jwt);

    MainApi.updateUserInfo({ email, name }, jwt)
      .then(() => {
        displayResponseSuccess('Данные успешно изменены');
        setCurrentUser({ _id, email, name });
        handleNewUserInfo(true);
      })
      .catch((error) => {
        try {
          displayResponseError('Ошибка изменения профиля:', error);
        } catch {
          displayUnknownError();
        }
      });
  }

  /*
    Управление открытием модального окна
  */
  const toggleOpenInfoTooltip = () => {
    isInfoTooltipOpened ? setInfoTooltipOpened(false) : setInfoTooltipOpened(true);
  }

  const handleDisplayInfoTooltip = ({ title, texts, image }) => {
    setInfoTooltipOpened(true);
    setInfoTooltipData({ title, texts, image });
  }

  /*
    Загрузка фильмов
  */

  const handleSearch = (input) => {
    const deviceWidth = window.innerWidth;
    const count = initialMoviesCount(deviceWidth);
    setIsLoaderOpened(true);
    BeatFilm.getMovies()
      .then((result) => {
        const transformedResult = transformFromBeatFilm(result);
        const filteredResult = filterMovies(transformedResult, input);
        setMoviesCards(filteredResult); //все найденные
        setMoviesCardsVisible(filteredResult.slice(0, count)); //первоначальные
        setPosition(count);
        localStorage.setItem(localStorageKeys.moviesCardsVisible, JSON.stringify(filteredResult.slice(0, count)));
        //localStorage.setItem(localStorageKeys.moviesCards, JSON.stringify(filteredResult));
      })
      .catch((error) => {
        handleDisplayInfoTooltip({
          title: 'Ошибка',
          texts: ['Во время запроса произошла ошибка. Возможно, проблема с соединением или сервер недоступен. Подождите немного и попробуйте ещё раз', error.status],
          image: onFailureResponse
        })
      })
      .finally(() => {
        setIsLoaderOpened(false);
      });
  }

  const handleSearchSaved = (input) => {
    const filteredResult = filterMovies(savedMovies, input);
    setSavedMovies(filteredResult);
  }

  const handleFilterShortMeter = (state) => {
    if (state) {
      setFilterCkeckboxSatate(true);
      setMoviesCardsUnfiltered(moviesCardsVisible);
      setMoviesCardsVisible(moviesCardsVisible.filter(movie => movie.duration <= 40))
    }
    else {
      setFilterCkeckboxSatate(false);
      setMoviesCardsVisible(moviesCardsUnfiltered);
    }
  }

  const handleFilterShortMeterSaved = (state) => {
    if (state) {
      setfilterCkeckboxSavedSatate(true);
      setSavedMoviesUnfiltered(savedMovies);
      setSavedMovies(savedMovies.filter(movie => movie.duration <= 40))
    }
    else {
      setfilterCkeckboxSavedSatate(false);
      setSavedMovies(savedMoviesUnfiltered);
    }
  }

  const handleAddMoreMovies = (deviceWidth) => {
    const count = initialMoviesCount(deviceWidth);
    const nextPosition = position + count;
    const newMovies = moviesCards.slice(position, nextPosition);

    setMoviesCardsVisible([...moviesCardsVisible, ...newMovies]);
    setPosition(nextPosition);
    localStorage.setItem(localStorageKeys.moviesCardsVisible, JSON.stringify(moviesCardsVisible));
  }

  /*
    Управление 
  */

  const handleDeleteFromSaved = (movie) => {
    const jwt = localStorage.getItem(localStorageKeys.jwt);
    let id = movie._id;

    if (id === undefined) {
      savedMovies.forEach(item => {
        if (item.owner._id === currentUser._id && item.movieId === movie.movieId) {
          id = item._id;
        }
      });
    }

    MainApi.deleteMovie({ movieId: id }, jwt)
      .then(() => {
        setSavedMovies((state) => state.filter(card => card.movieId !== movie.movieId))
      })
      .catch((error) => {
        handleDisplayInfoTooltip({
          title: 'Ошибка',
          texts: [error.status],
          image: onFailureResponse
        })
      })
  }

  const handleToggleSave = (state, moviesCard) => {
    const jwt = localStorage.getItem(localStorageKeys.jwt);

    if (state) {
      MainApi.saveMovie(moviesCard, jwt)
        .then((result) => {
          setSavedMovies([result, ...savedMovies]);
        })
        .catch((error) => {
          handleDisplayInfoTooltip({
            title: 'Ошибка',
            texts: [error.status],
            image: onFailureResponse
          })
        });
    }
    else {
      handleDeleteFromSaved(moviesCard);
    }
  }

  /*
    Вёрстка компонента
  */
  return (
    <CurrentUserContext.Provider value={{ currentUser: currentUser, isLoggedIn: isLoggedIn }}>
      <Router>
        <div className='app app__content'>
          <Routes>
            <Route
              exact path={appRoutes.root}
              element={<Main />}
            />
            <Route
              exact path={appRoutes.content.movies}
              element={
                <ProtectedRoute>
                  <Movies
                    onSearch={handleSearch}
                    onFilter={handleFilterShortMeter}
                    onAddMore={handleAddMoreMovies}
                    onToggleSave={handleToggleSave}
                    onDelete={null}
                    area={areas.areaMovies}
                    moviesCards={moviesCardsVisible}
                    savedMovies={savedMovies}
                    totalSize={moviesCards.length}
                    filterState={filterCkeckboxSatate}
                  />
                </ProtectedRoute>}
            />
            <Route
              exact path={appRoutes.content.savedMovies}
              element={
                <ProtectedRoute>
                  <SavedMovies
                    onSearch={handleSearchSaved}
                    onFilter={handleFilterShortMeterSaved}
                    onAddMore={null}
                    onToggleSave={null}
                    onDelete={handleDeleteFromSaved}
                    area={areas.areaSavedMovies}
                    moviesCards={savedMovies}
                    savedMovies={null}
                    totalSize={0}
                    filterState={filterCkeckboxSavedSatate}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              exact path={appRoutes.profile}
              element={
                <ProtectedRoute>
                  <Profile
                    onSignOut={handleSignOut}
                    onUpdateUserInfo={handleUpdateUserInfo}
                  />
                </ProtectedRoute>
              }
            />
            <Route
              exact path={appRoutes.auth.signIn}
              element={
                !isLoggedIn ? <Login
                  onSignIn={handleSignIn}
                /> : <Navigate
                  to={appRoutes.content.movies}
                />}
            />
            <Route exact path={appRoutes.auth.signUp}
              element={
                !isLoggedIn ? <Register
                  onSignUp={handleSignUp}
                /> : <Navigate
                  to={appRoutes.content.movies}
                />}
            />
            <Route
              path={appRoutes.any}
              element={<NotFound />}
            />
          </Routes>
          <InfoTooltip
            isOpened={isInfoTooltipOpened}
            data={infoTooltipData}
            onClose={toggleOpenInfoTooltip}
          />
          <Loader
            isOpened={isLoaderOpened}
          />
        </div>
      </Router>
    </CurrentUserContext.Provider>
  );
}

export default App;
