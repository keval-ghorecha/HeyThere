import React, {useEffect, useRef, useState} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import * as geolib from 'geolib';

import BaseScreen from '../../components/BaseScreen';

import {useNavigation} from '@react-navigation/native';

import MapView, {
  PROVIDER_GOOGLE,
  enableLatestRenderer,
  Marker,
  MapCircle,
} from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/Feather';
enableLatestRenderer();

import styles from './style';
import {brandColors} from '../../components/Core/basicStyles';

const MapScreen = () => {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [userList, setUserList] = useState([]);
  const [currentLocation, setPosition] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.3,
    longitudeDelta: 0.3,
  });

  const onMapReady = () => {
    getUserLocation();
  };
  console.log('useasasdsaList', userList);
  const getUserLocation = () => {
    console.log('getUserLocation::');
    Geolocation.getCurrentPosition(
      async position => {
        console.log('getUserLocation::position::', position);
        const currLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          latitudeDelta: 0.0421,
          longitudeDelta: 0.0421,
        };
        setPosition(currLocation);
        mapRef.current.animateToRegion(currLocation);
      },
      async error => {
        // See error code charts below.
        console.log('Geolocation Error' + error.code, error.message);
      },
      {enableHighAccuracy: true, timeout: 15000},
    );
  };

  useEffect(() => {
    const latitude = currentLocation.latitude;
    console.log(
      '🚀 ~ file: index.js:63 ~ useEffect ~ currentLocation.latitude',
      currentLocation.latitude,
    );
    const longitude = currentLocation.longitude;
    const distance = 1000;

    let lat = 0.0144927536231884;
    let lon = 0.0181818181818182;

    let lowerLat = latitude - lat * distance;
    let lowerLon = longitude - lon * distance;

    let greaterLat = latitude + lat * distance;
    let greaterLon = longitude + lon * distance;

    let lesserGeopoint = new firestore.GeoPoint(lowerLat, lowerLon);
    let greaterGeopoint = new firestore.GeoPoint(greaterLat, greaterLon);

    const collectionRef = firestore()
      .collection('Users')
      .where('liveLocation', '>', lesserGeopoint)
      .where('liveLocation', '<', greaterGeopoint);
    const unsubscribe = collectionRef.onSnapshot(
      querySnapshot => {
        querySnapshot.docs.map(item => {
          console.log(
            '🚀 ~ file: index.js:66 ~ useEffect ~ filterData',
            item?.data().liveLocation,
          );
        });

        const filterData =
          querySnapshot.docs.filter(
            i => i.data().userId !== auth().currentUser.uid,
          ) || [];
        const updateData = filterData
          .map(doc => {
            const liveLocation = doc.data()?.liveLocation;
            if (!liveLocation) return;
            const isInRange = geolib?.isPointWithinRadius(
              {
                latitude: liveLocation?.latitude,
                longitude: liveLocation?.longitude,
              },
              {
                latitude: currentLocation?.latitude,
                longitude: currentLocation?.longitude,
              },
              10000,
            );
            if (!isInRange) return;
            return {
              name: `${doc.data()?.firstName}  ${doc.data()?.lastName}`,
              image: 'https://i.pravatar.cc/',
              _id: doc.data()?.userId,
              userId: doc.data()?.userId,
              liveLocation,
            };
          })
          ?.filter(i => i);
        console.log('asdfweqwefghtgrfedwsqswdefrgtgrfedwsq', updateData);
        setUserList(updateData);
      },
      e => {
        alert(e);
      },
    );

    return () => unsubscribe();
  }, [currentLocation]);

  useEffect(() => {
    const locationUpload = setInterval(() => {
      const userCollection = firestore().collection('Users');
      const userId = auth().currentUser.uid;
      userCollection.doc(userId).update({
        liveLocation: new firestore.GeoPoint(
          currentLocation?.latitude,
          currentLocation?.longitude,
        ),
      });
    }, 15000);
    return () => clearInterval(locationUpload);
  }, []);
  useEffect(() => {
    getUserLocation();
  }, []);

  return (
    <BaseScreen title={'MapScreen'} logout>
      <MapView
        ref={mapRef}
        onMapReady={onMapReady}
        provider={PROVIDER_GOOGLE} // remove if not using Google Maps
        style={styles.map}
        region={currentLocation}
        showsUserLocation={true}
        showsMyLocationButton={true}
        followsUserLocation={true}
        showsCompass={true}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={true}
        draggable={true}
        loadingEnabled
        rotateEnabled={true}>
        {userList.map(i => (
          <Marker
            key={`key_${i.liveLocation.longitude}_${i.liveLocation.latitude}`}
            coordinate={{
              latitude: i.liveLocation.latitude,
              longitude: i.liveLocation.longitude,
            }}
            position={{
              latitude: i.liveLocation.latitude,
              longitude: i.liveLocation.longitude,
            }}
            // centerOffset={{x: -18, y: -60}}
            // anchor={{x: 0.69, y: 1}}
            pinColor={'blue'}
          />
        ))}

        <Marker
          ref={markerRef}
          coordinate={currentLocation}
          position={currentLocation}
          centerOffset={{x: -18, y: -60}}
          anchor={{x: 0.69, y: 1}}
          pinColor={'red'}
        />
      </MapView>
    </BaseScreen>
  );
};

export default MapScreen;
