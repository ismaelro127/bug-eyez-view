
import m3u8

def get_now_playing(m3u8_url):
    playlist = m3u8.load(m3u8_url)
    segments = playlist.segments
    if segments:
        latest = segments[-1]
        print(f'NOW PLAYING: {latest.uri}')
        print(f'TIME: {latest.program_date_time}')
    else:
        print('No segments found.')

if __name__ == '__main__':
    test_url = input('Enter .m3u8 URL: ')
    get_now_playing(test_url)
